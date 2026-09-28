export type IAlphaVideoPlayerErrorCode =
  | 'PLAYER_DESTROYED'
  | 'PLAYER_NOT_INITIALIZED'
  | 'VIDEO_SOURCE_MISSING'

export class AlphaVideoPlayerError extends Error {
  public readonly code: IAlphaVideoPlayerErrorCode
  public readonly action: string

  constructor (code: IAlphaVideoPlayerErrorCode, action: string, message: string) {
    super(`[alpha-video-player-js]: ${message}`)
    this.name = 'AlphaVideoPlayerError'
    this.code = code
    this.action = action
    Object.setPrototypeOf(this, AlphaVideoPlayerError.prototype)
  }
}

export const isAlphaVideoPlayerError = (error: unknown): error is AlphaVideoPlayerError => (
  error instanceof AlphaVideoPlayerError ||
  !!error && typeof error === 'object' &&
  (error as { name?: unknown }).name === 'AlphaVideoPlayerError' &&
  typeof (error as { code?: unknown }).code === 'string'
)

export const playerDestroyedError = (action: string) => new AlphaVideoPlayerError(
  'PLAYER_DESTROYED',
  action,
  `cannot ${action} because this player has been destroyed. Create a new player instance before calling ${action}().`,
)

export const playerNotInitializedError = (action: string) => new AlphaVideoPlayerError(
  'PLAYER_NOT_INITIALIZED',
  action,
  `cannot ${action} because the renderer was not initialized. Check onInitError for the initialization failure.`,
)

export const videoSourceMissingError = (action: string) => new AlphaVideoPlayerError(
  'VIDEO_SOURCE_MISSING',
  action,
  `cannot ${action} because no video source has been set. Provide src, call setSrc(src), or call updateConfig({ src }) first.`,
)
