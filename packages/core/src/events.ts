export const PLATFORM_EVENTS = {
  // Client -> Server
  GAME_CONNECT: 'game:connect',
  GAME_ACTION: 'game:action',

  // Server -> Client
  GAME_STATE: 'game:state',
  GAME_STATE_PATCH: 'game:state-patch',
  GAME_ERROR: 'game:error',
  PLAYER_JOINED: 'player:joined',
  PLAYER_STATUS: 'player:status',
  PLAYER_REMOVED: 'player:removed',
} as const;

export const HUB_EVENTS = {
  // Client -> Server
  HUB_CONNECT: 'hub:connect',

  // Server -> Client
  HUB_STATE: 'hub:state',
  HUB_PLAYER_JOINED: 'hub:player-joined',
  HUB_PLAYER_STATUS: 'hub:player-status',
  HUB_PLAYER_REMOVED: 'hub:player-removed',
  HUB_GAME_CREATED: 'hub:game-created',
  HUB_GAME_FINISHED: 'hub:game-finished',
  HUB_ERROR: 'hub:error',
} as const;
