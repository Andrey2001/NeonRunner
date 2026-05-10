export interface GameState {
  score: number;
  lives: number;
  isGameOver: boolean;
  isStarted: boolean;
  speed: number;
  level: number;
}

export type Lane = -2 | -1 | 0 | 1 | 2;

export interface Obstacle {
  id: string;
  lane: Lane;
  z: number;
}

export interface PointItem {
  id: string;
  lane: Lane;
  z: number;
  collected: boolean;
}
