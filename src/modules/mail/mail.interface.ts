export interface MessageConfig {
    config: {
        title: string;
        body: string;
    };
    i18n?: string[];
}

export interface MailModuleOptions {
    apiPrefix: string;
    auth: {
        username: string;
        password: string;
    };
    displayName: string;
    displayAddress: string;
    frameworkTemplate: string;
    getLocaleTextMap: (locale: string) => Record<string, any>;
    getMessage: (messageId: string) => MessageConfig;
}
