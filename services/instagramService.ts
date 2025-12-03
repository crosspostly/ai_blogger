
// Service to handle Instagram integration

export interface InstagramConfig {
    accessToken: string;
    accountId: string;
    username?: string;
}

class InstagramService {
    private isConnected: boolean = false;
    private config: InstagramConfig | null = null;

    constructor() {
        // Load from storage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('instagram_config');
            if (saved) {
                try {
                    this.config = JSON.parse(saved);
                    this.isConnected = true;
                } catch (e) {
                    localStorage.removeItem('instagram_config');
                }
            }
        }
    }

    // Connect (Simulated)
    async connect(): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockConfig: InstagramConfig = {
                    accessToken: 'mock_token_' + Date.now(),
                    accountId: '123456789',
                    username: 'travel_blogger_ai'
                };
                this.config = mockConfig;
                localStorage.setItem('instagram_config', JSON.stringify(mockConfig));
                this.isConnected = true;
                resolve(true);
            }, 1500); // Simulate network delay
        });
    }

    disconnect() {
        this.isConnected = false;
        this.config = null;
        localStorage.removeItem('instagram_config');
    }

    getConnectedStatus(): boolean {
        return this.isConnected;
    }

    getUsername(): string {
        return this.config?.username || 'user';
    }

    // Publish Media (Simulated)
    async publishContent(mediaUrl: string, caption: string): Promise<{ success: boolean; id?: string; error?: string }> {
        if (!this.isConnected) {
            return { success: false, error: "Not connected to Instagram." };
        }

        // Simulate API call delay
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockId = "ig_media_" + Math.random().toString(36).substr(2, 9);
                resolve({ success: true, id: mockId });
            }, 2500); 
        });
    }
}

export const instagramService = new InstagramService();
