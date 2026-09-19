export { };

declare global {
    interface Window {
        electronAPI: {
            getAppVersion: () => Promise<string>;
            storeGet: (key: string) => Promise<any>;
            storeSet: (key: string, value: any) => Promise<boolean>;
        };
    }
}
