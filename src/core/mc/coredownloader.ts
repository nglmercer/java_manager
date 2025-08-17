import path from "path";
import { parse } from "node-html-parser";
import { DataStorage } from "json-obj-manager";
import { JSONFile } from "json-obj-manager/node";
import { defaultLogger as logger } from "../../logger/index.js";
import CORES_URL_GEN from "./coresURLGenerator.js";

// Interfaces para tipado
interface CachedData {
    lastUpdated: string;
    versions: Record<string, string>;
}

interface SpigotVersion {
    version: string;
    size: string;
    releaseDate: string;
    downloadLink: string;
}

interface ServerCore {
    name: string;
    displayName: string;
    versionsMethod: string;
    urlGetMethod: string;
    versionsUrl?: string;
}

interface ManifestVersion {
    id: string;
    url: string;
}

interface VersionInfo {
    downloads?: {
        server?: {
            url: string;
        };
    };
}

interface Manifest {
    versions: ManifestVersion[];
}

interface PurpurResponse {
    versions?: string[];
}

const filePath = path.join(process.cwd(), "temp/cores.json");
const storage = new DataStorage<CachedData>(new JSONFile(filePath));

const writeCoresFile = async (data: CachedData): Promise<void> => {
    await storage.save("cores",data);
};

const readCoresFile = async (): Promise<CachedData | null> => {
    return await storage.load("cores");
};

const isDataRecent = (data: CachedData | null, maxAgeInMs: number = 24 * 60 * 60 * 1000): boolean => {
    if (!data || !data.lastUpdated) return false;
    const now = new Date();
    const lastUpdated = new Date(data.lastUpdated);
    return (now.getTime() - lastUpdated.getTime()) < maxAgeInMs;
};

const fetchData = async (url: string, config: RequestInit = {}): Promise<any> => {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...config.headers
            },
            ...config
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        logger.warn(`Fallo al obtener datos de ${url}:`, {message: error instanceof Error ? error.message : JSON.stringify(error)});
        return null;
    }
};

const URLS = {
    SPIGOT: "https://getbukkit.org/download/spigot",
    MANIFEST: "https://piston-meta.mojang.com/mc/game/version_manifest.json",
    PURPUR: "https://api.purpurmc.org/v2/purpur/",
    MAGMA: "https://api.magmafoundation.org/api/v2/allVersions"
};

const PREDEFINED: { SERVER_CORES: Record<string, ServerCore> } = {
    SERVER_CORES: {
        vanilla: { name: "vanilla", displayName: "Vanilla", versionsMethod: "vanilla", urlGetMethod: "vanilla" },
        paper: { name: "paper", displayName: "PaperMC", versionsMethod: "paper", urlGetMethod: "paper" },
        waterfall: { name: "waterfall", displayName: "Waterfall (Proxy)", versionsMethod: "paper", urlGetMethod: "paper" },
        velocity: { name: "velocity", displayName: "Velocity (Proxy)", versionsMethod: "paper", urlGetMethod: "paper" },
        purpur: { name: "purpur", displayName: "PurpurMC", versionsMethod: "purpur", urlGetMethod: "purpur" },
        spigot: { name: "spigot", displayName: "Spigot", versionsMethod: "spigot", urlGetMethod: "spigot" }
    }
};

const getSpigotVersions = async (): Promise<SpigotVersion[]> => {
    try {
        const data = await fetchData(URLS.SPIGOT, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!data) return [];

        const root = parse(data);
        const versions: SpigotVersion[] = [];

        const downloadPanes = root.querySelectorAll('.download-pane');
        
        downloadPanes.forEach((element) => {
            const versionElement = element.querySelector('div.col-sm-3 h2');
            const sizeElement = element.querySelector('div.col-sm-2 h3');
            const releaseDateElement = element.querySelector('div.col-sm-3:nth-of-type(2) h3');
            const downloadLinkElement = element.querySelector('a.btn-download');

            const version = versionElement?.text?.trim() || '';
            const size = sizeElement?.text?.trim() || '';
            const releaseDate = releaseDateElement?.text?.trim() || '';
            const downloadLink = downloadLinkElement?.getAttribute('href') || '';

            if (version && downloadLink) {
                versions.push({ version, size, releaseDate, downloadLink });
            }
        });

        return versions;
    } catch (error) {
        console.error('Error obteniendo las versiones:', error);
        return [];
    }
};

const getAllMinecraftVersions = async (): Promise<Record<string, string>> => {
    try {
        const manifest: Manifest = await fetchData(URLS.MANIFEST);
        const versions: Record<string, string> = {};

        await Promise.all(manifest.versions.map(async ({ id, url }: ManifestVersion) => {
            try {
                const versionInfo: VersionInfo = await fetchData(url);
                if (versionInfo?.downloads?.server) {
                    versions[id] = versionInfo.downloads.server.url;
                }
            } catch (error) {
                logger.error(`Error obteniendo versión ${id}:`, error instanceof Error ? error.message : error);
            }
        }));
        return versions;
    } catch (error) {
        logger.error("Error obteniendo todas las versiones de Minecraft:", error instanceof Error ? error.message : error);
        return {};
    }
};

const getVanillaCore = async (): Promise<string[]> => {
    const cachedData = await readCoresFile();
    if (cachedData && isDataRecent(cachedData)) {
        logger.info("Usando datos cacheados");
        return Object.keys(cachedData.versions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    logger.info("Obteniendo datos de la red");
    const allVersions = await getAllMinecraftVersions();
    await writeCoresFile({ lastUpdated: new Date().toISOString(), versions: allVersions });
    return Object.keys(allVersions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const getCoreVersions = async (core: string): Promise<string[] | SpigotVersion[] | false> => {
    const coreItem = PREDEFINED.SERVER_CORES[core];
    if (!coreItem) return false;

    switch (coreItem.versionsMethod) {
        case "vanilla": return await getVanillaCore();
        case "externalURL": return await CORES_URL_GEN.getAllCoresByExternalURL(coreItem.versionsUrl!, coreItem.name);
        case "paper": return await CORES_URL_GEN.getAllPaperLikeCores(coreItem.name);
        case "purpur": {
            const data: PurpurResponse = await fetchData(URLS.PURPUR);
            return data?.versions?.reverse() || [];
        }
        case "magma": {
            const data = await fetchData(URLS.MAGMA);
            return data || [];
        }
        case "spigot": return await getSpigotVersions();
        default: return false;
    }
};

const getCoreVersionURL = async (core: string, version: string): Promise<string | false> => {
    const coreItem = PREDEFINED.SERVER_CORES[core];
    if (!coreItem || !version) return false;

    switch (coreItem.urlGetMethod) {
        case "vanilla": {
            const versions = await getAllMinecraftVersions();
            return versions[version] || false;
        }
        case "externalURL": return await CORES_URL_GEN.getCoreByExternalURL(coreItem.versionsUrl!, version);
        case "paper": return await CORES_URL_GEN.getPaperCoreURL(coreItem.name, version);
        case "purpur": return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
        case "magma": return `https://api.magmafoundation.org/api/v2/${version}/latest/download`;
        default: return false;
    }
};

const getCoresList = (): Record<string, ServerCore> => PREDEFINED.SERVER_CORES;
/* async function test() {
    const result = await getCoreVersions("vanilla");
    console.log("result", result);
}
test() */
export {
    getSpigotVersions,
    getAllMinecraftVersions,
    getVanillaCore,
    getCoreVersions,
    getCoreVersionURL,
    getCoresList,
    type SpigotVersion,
    type ServerCore,
    type CachedData
};