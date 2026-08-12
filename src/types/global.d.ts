declare namespace NodeJs {
    interface ProcessEnv {
        JWT_SECRET: string;
        DATABASE_URL: string;
        RESEND_API_KEY: string;
        NEXT_PUBLIC_APP_URL: string;
        NEXT_PUBLIC_SITE_URL?: string;
        FRONTEND_URL?: string;
        ADMIN_URL?: string;
        DASHBOARD_URL?: string;
        API_BASE_URL?: string;
        HEALTH_CHECK_URL?: string;
        AUTH_URL?: string;
        PAYMENT_URL?: string;
        COMMISSION_URL?: string;
        SUPPORT_EMAIL?: string;
        DOCUMENTATION_URL?: string;
        COMMUNITY_URL?: string;
    }
}

declare var process: {
    env: NodeJs.ProcessEnv;
};
