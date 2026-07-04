export type SetupType = 'blank' | 'existing';

export type TraderMod = 'none' | 'expansion' | 'drJones' | 'traderPlus';

export interface Project {
    id: string;
    name: string;
    path: string;
    map: string;
    setupType: SetupType;
    profileFolderName: string;
    missionFolder: string;
    mapPath: string;
    mapSize: number;
    traders: TraderMod;
    createBackups: boolean;
    serverConfigPath?: string;
    economyCorePath?: string;
    eventsXmlPath?: string;
    eventSpawnsXmlPath?: string;
    eventGroupsXmlPath?: string;
    userDefinitionsPath?: string;
    globalsXmlPath?: string;
    playerSpawnsXmlPath?: string;
}

export interface ConfigFile {
    id: string;
    name: string;
    path: string;
}

export interface Mod {
    name: string;
    configs: ConfigFile[];
}

