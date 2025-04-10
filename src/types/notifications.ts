export interface Notification {
    id: string;
    userid: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    data?: any;
    created_at: string;
    updated_at: string;
}

export interface PushToken {
    id: string;
    user_id: string;
    token: string;
    device_id?: string;
    platform?: string;
    created_at: string;
    updated_at: string;
} 