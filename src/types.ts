export interface UserProfile {
  uid: string;
  username?: string;
  displayName: string;
  searchName?: string;
  photoURL: string;
  email: string;
  status?: 'online' | 'offline';
  lastSeen?: string;
  role?: 'admin' | 'moderator' | 'user';
  isPremium?: boolean;
  premiumFeatures?: {
    canSetVideoAsPhoto: boolean;
    canUseAnimatedStickers: boolean;
    canUseAdvancedThemes: boolean;
    canHideLastSeen: boolean;
  };
  bio?: string;
  phoneNumber?: string;
  twoStepEnabled?: boolean;
  videoPhotoURL?: string;
  isBanned?: boolean;
  isMuted?: boolean;
  isDeviceBanned?: boolean;
  dataSaver?: boolean;
  isBot?: boolean;
  botOwnerId?: string;
  botToken?: string;
  botType?: 'general' | 'image_generator' | 'name_decorator' | 'image_editor' | 'channel_manager';
  botDescription?: string;
  botAbout?: string;
}

export interface Video {
  id: string;
  userId: string;
  userName: string;
  url: string;
  title: string;
  description: string;
  timestamp: any;
}

export interface ChatPermissions {
  canChangeInfo: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
  canInviteUsers: boolean;
  canPinMessages: boolean;
  canManageVideoChats: boolean;
  canAddAdmins: boolean;
  canSendMessages: boolean;
  canSendMedia: boolean;
  canSendStickers: boolean;
  canSendPolls: boolean;
  canEmbedLinks: boolean;
  canAddUsers: boolean;
}

export interface ChatAdmin {
  uid: string;
  customTitle?: string;
  permissions: ChatPermissions;
}

export interface Chat {
  id: string;
  type: 'private' | 'group' | 'saved';
  name?: string;
  photoURL?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  memberIds: string[];
  createdBy: string;
  isPublic?: boolean;
  username?: string;
  inviteLink?: string;
  pinnedMessageId?: string;
  bannedUserIds?: string[];
  mutedUserIds?: string[];
  admins?: Record<string, {
    permissions: ChatPermissions;
    customTitle?: string;
  }>;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isEdited?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: string;
  seenBy?: string[];
  isDeleted?: boolean;
  isUploading?: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
