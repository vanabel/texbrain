export interface CollabUser {
  name: string;
  color: string;
  colorLight: string;
}

export interface CollabPeer {
  clientId: number;
  user: CollabUser;
  currentFile: string | null;
}

export interface CollabRoomInfo {
  /** Signaling room name (`tb` + shareCode). */
  id: string;
  /** 5-char display code (识别码): letters + digits, case-sensitive. */
  shareCode: string;
  /** 6-char access pin (验证码): letters + digits; also the encryption secret. */
  accessPin: string;
  secret: string;
  password: string | null;
  isHost: boolean;
}
