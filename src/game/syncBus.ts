import {
  BrigadeId,
  MemberRole,
  ScreenView,
  SessionState,
} from '../types/game';

export const STORAGE_STATE_KEY = 'uptime-night-shift-state-v1';
export const STORAGE_PACKET_KEY = 'uptime-night-shift-packet-v1';
export const STORAGE_LEADER_KEY = 'uptime-night-shift-clock-leader-v1';
export const BROADCAST_CHANNEL_NAME = 'uptime-night-shift-channel-v1';

export interface LaunchConfig {
  screen?: ScreenView;
  projectorClean?: boolean;
  brigade?: BrigadeId;
  role?: MemberRole;
}

const VALID_SCREENS: ScreenView[] = [
  'hall',
  'brigade',
  'arbiter',
  'host',
  'materials',
];
const VALID_BRIGADES: BrigadeId[] = ['TRY', 'CATCH', 'FINALLY'];
const VALID_ROLES: MemberRole[] = [
  'аналитик',
  'картёр',
  'чтец',
  'писарь',
  'докладчик',
  'арбитр',
];

/**
 * Разбирает параметры запуска из URL (?search и #hash).
 * Поддерживает #projector для локального запуска file:///.../uptime-portable.html#projector.
 */
export function parseLaunchParams(search = '', hash = ''): LaunchConfig {
  const result: LaunchConfig = {};
  const cleanHash = hash.replace(/^#/, '').trim();

  if (cleanHash === 'projector' || cleanHash === 'hall-projector') {
    result.screen = 'hall';
    result.projectorClean = true;
    return result;
  }

  if (VALID_SCREENS.includes(cleanHash as ScreenView)) {
    result.screen = cleanHash as ScreenView;
  }

  const combined = new URLSearchParams(search.replace(/^\?/, ''));
  if (cleanHash.includes('=')) {
    const hashParams = new URLSearchParams(cleanHash);
    hashParams.forEach((v, k) => combined.set(k, v));
  }

  const screenParam = combined.get('screen');
  if (screenParam && VALID_SCREENS.includes(screenParam as ScreenView)) {
    result.screen = screenParam as ScreenView;
  }

  const projParam = combined.get('projector');
  if (projParam === '1' || projParam === 'true') {
    result.screen = result.screen || 'hall';
    result.projectorClean = true;
  }

  const brigadeParam = combined.get('brigade');
  if (brigadeParam && VALID_BRIGADES.includes(brigadeParam as BrigadeId)) {
    result.brigade = brigadeParam as BrigadeId;
  }

  const roleParam = combined.get('role');
  if (roleParam && VALID_ROLES.includes(roleParam as MemberRole)) {
    result.role = roleParam as MemberRole;
  }

  return result;
}

export function isValidSessionState(candidate: unknown): candidate is SessionState {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.code === 'string' &&
    typeof obj.shiftClock === 'string' &&
    typeof obj.brigades === 'object' &&
    obj.brigades !== null &&
    typeof obj.battles === 'object' &&
    obj.battles !== null &&
    Array.isArray(obj.shield) &&
    Array.isArray(obj.waves) &&
    typeof obj.queue === 'object' &&
    obj.queue !== null &&
    typeof obj.practice === 'object' &&
    obj.practice !== null
  );
}

export function loadPersistedSessionState(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null
): SessionState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidSessionState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSessionState(
  state: SessionState,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
  } catch {
    // Игнорируем переполнение или запрет localStorage
  }
}

export function clearPersistedSessionState(
  storage: Pick<Storage, 'removeItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null
): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_STATE_KEY);
  } catch {
    // ignore
  }
}

interface LeaderLease {
  leaderId: string;
  isHost: boolean;
  timestamp: number;
}

/**
 * Выбор единственного генератора секундного такта (Clock Leader) среди открытых окон браузера.
 * Предотвращает ускорение таймера в 2–3 раза при открытии нескольких окон без сервера.
 */
export function acquireOrCheckClockLeader(
  windowId: string,
  isPreferredHost: boolean,
  nowMs = Date.now(),
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null,
  leaseTtlMs = 2400
): boolean {
  if (!storage) return true;
  try {
    const raw = storage.getItem(STORAGE_LEADER_KEY);
    let current: LeaderLease | null = null;
    if (raw) {
      try {
        current = JSON.parse(raw) as LeaderLease;
      } catch {
        current = null;
      }
    }

    const expired = !current || nowMs - current.timestamp > leaseTtlMs;
    const isSelf = current?.leaderId === windowId;
    const canPreempt = isPreferredHost && current && !current.isHost;

    if (expired || isSelf || canPreempt) {
      const nextLease: LeaderLease = {
        leaderId: windowId,
        isHost: isPreferredHost,
        timestamp: nowMs,
      };
      storage.setItem(STORAGE_LEADER_KEY, JSON.stringify(nextLease));
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export interface SyncPacket {
  type: 'STATE_PACKET' | 'HELLO_PING' | 'HELLO_PONG';
  senderId: string;
  actionType?: string;
  state?: SessionState;
  timestamp: number;
}

export interface CrossWindowSyncBusOptions {
  windowId: string;
  getCurrentState: () => SessionState;
  onRemoteState: (state: SessionState, actionType?: string) => void;
  onPeersChanged?: (peerWindowCount: number) => void;
}

export interface CrossWindowSyncBus {
  publishState: (state: SessionState, actionType: string) => void;
  close: () => void;
}

export function createCrossWindowSyncBus(
  options: CrossWindowSyncBusOptions
): CrossWindowSyncBus {
  const { windowId, getCurrentState, onRemoteState, onPeersChanged } = options;
  const peerTimestamps = new Map<string, number>();
  let bc: BroadcastChannel | null = null;
  let lastHandledTimestamp = 0;

  const notifyPeerCount = () => {
    if (!onPeersChanged) return;
    const now = Date.now();
    peerTimestamps.forEach((ts, id) => {
      if (now - ts > 12000) peerTimestamps.delete(id);
    });
    // Общее число окон = текущее окно (1) + активные соседние окна
    onPeersChanged(1 + peerTimestamps.size);
  };

  const sendRawPacket = (packet: SyncPacket) => {
    if (bc) {
      try {
        bc.postMessage(packet);
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_PACKET_KEY, JSON.stringify(packet));
      } catch {
        // ignore
      }
    }
  };

  const handleIncomingPacket = (packet: SyncPacket | null | undefined) => {
    if (!packet || typeof packet !== 'object') return;
    if (packet.senderId === windowId) return; // Защита от эхо-петли

    peerTimestamps.set(packet.senderId, Date.now());
    notifyPeerCount();

    if (packet.type === 'HELLO_PING') {
      sendRawPacket({
        type: 'HELLO_PONG',
        senderId: windowId,
        state: getCurrentState(),
        timestamp: Date.now(),
      });
      return;
    }

    if (
      (packet.type === 'STATE_PACKET' || packet.type === 'HELLO_PONG') &&
      packet.state &&
      isValidSessionState(packet.state)
    ) {
      if (packet.timestamp <= lastHandledTimestamp && packet.type === 'STATE_PACKET') {
        return;
      }
      lastHandledTimestamp = packet.timestamp;
      onRemoteState(packet.state, packet.actionType);
    }
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (ev) => {
        handleIncomingPacket(ev.data as SyncPacket);
      };
    } catch {
      bc = null;
    }
  }

  const onStorageEvent = (ev: StorageEvent) => {
    if (ev.key === STORAGE_PACKET_KEY && ev.newValue) {
      try {
        const packet = JSON.parse(ev.newValue) as SyncPacket;
        handleIncomingPacket(packet);
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorageEvent);
  }

  // Приветственный пинг при открытии нового окна (например, окна проектора)
  sendRawPacket({
    type: 'HELLO_PING',
    senderId: windowId,
    timestamp: Date.now(),
  });

  const heartbeatInterval =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          sendRawPacket({
            type: 'HELLO_PING',
            senderId: windowId,
            timestamp: Date.now(),
          });
          notifyPeerCount();
        }, 4000)
      : undefined;

  return {
    publishState(state: SessionState, actionType: string) {
      if (actionType === 'RESET_SESSION') {
        clearPersistedSessionState();
      }
      persistSessionState(state);
      sendRawPacket({
        type: 'STATE_PACKET',
        senderId: windowId,
        actionType,
        state,
        timestamp: Date.now(),
      });
    },
    close() {
      if (heartbeatInterval) window.clearInterval(heartbeatInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorageEvent);
      }
      if (bc) {
        try {
          bc.close();
        } catch {
          // ignore
        }
      }
    },
  };
}
