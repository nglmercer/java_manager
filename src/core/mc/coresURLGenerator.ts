import { defaultLogger as logger } from "../../logger/index.js";

// Interfaces para tipado
interface PaperBuildData {
    builds: number[];
}

interface PaperBuildInfo {
    downloads?: {
        application?: {
            name: string;
        };
    };
}

interface PaperProjectData {
    versions: string[];
}

interface PurpurData {
    versions: string[];
}

interface ExternalCoreData {
    [version: string]: string;
}

type CallbackFunction = (data: any) => void;

const getDataByURL = async (url: string, cb?: CallbackFunction): Promise<any> => {
    if (cb) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) {
                cb(false);
                console.error(`HTTP error! status: ${response.status}`);
                return;
            }
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            cb(data);
        } catch (error) {
            cb(false);
            console.error(error);
        }
        return;
    }
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
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
        logger.warn(`Failed to fetch data from ${url}:`, {message: error instanceof Error ? error.message : JSON.stringify(error)});
        return null;
    }
};

class CoreDownloader {
    /**
     * Obtiene la URL de descarga de un core basado en PaperMC.
     * @param core - Tipo de core (paper, folia, etc.).
     * @param version - Versión del core.
     * @returns URL de descarga o `false` si falla.
     */
    static async getPaperCoreURL(core: string, version: string): Promise<string | false> {
        try {
            const baseUrl = `https://api.papermc.io/v2/projects/${core}/versions/${version}`;
            logger.info("[INFO] PaperCore First Step URL", {data:baseUrl});

            const data: PaperBuildData = await getDataByURL(baseUrl);
            if (!data || !data.builds?.length) {
                logger.warn("[WARNING] No builds found for PaperMC");
                return false;
            }

            // Obtener la última build disponible
            const latestBuild = Math.max(...data.builds);
            const buildUrl = `${baseUrl}/builds/${latestBuild}`;
            const buildData: PaperBuildInfo = await getDataByURL(buildUrl);

            if (!buildData || !buildData.downloads?.application?.name) {
                logger.warn("[WARNING] No application download found for PaperMC");
                return false;
            }

            // Construir la URL final de descarga
            const fileName = buildData.downloads.application.name;
            const downloadURL = `${buildUrl}/downloads/${fileName}`;

            logger.info("[INFO] PaperMC Download URL:", {downloadURL});
            return downloadURL;
        } catch (error) {
            logger.error("[ERROR] Failed to fetch Paper core URL:", error);
            return false;
        }
    }

    /**
     * Obtiene la URL de descarga de Purpur.
     * @param version - Versión del core.
     * @returns URL de descarga.
     */
    static async getPurpurCoreURL(version: string): Promise<string> {
        return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
    }

    /**
     * Obtiene la URL de descarga de Magma.
     * @param version - Versión del core.
     * @returns URL de descarga.
     */
    static async getMagmaCoreURL(version: string): Promise<string> {
        return `https://api.magmafoundation.org/api/v2/${version}/latest/download`;
    }

    /**
     * Obtiene la URL de un core desde una API externa.
     * @param url - URL de la API externa.
     * @param version - Versión del core.
     * @returns URL de descarga o `false` si falla.
     */
    static async getCoreByExternalURL(url: string, version: string): Promise<string | false> {
        try {
            const data: ExternalCoreData = await getDataByURL(url);
            if (!data || !data[version]) {
                logger.warn("External API response invalid or missing version");
                return false;
            }
            return data[version];
        } catch (error) {
            logger.error("Error fetching external core URL:", error);
            return false;
        }
    }

    /**
     * Obtiene todas las versiones de cores basados en Paper.
     * @param core - Tipo de core (paper, folia, etc.).
     * @returns Lista de versiones o `false` si falla.
     */
    static async getAllPaperLikeCores(core: string = "paper"): Promise<string[] | false> {
        try {
            const url = `https://api.papermc.io/v2/projects/${core}`;
            const data: PaperProjectData = await getDataByURL(url);

            if (!data || !data.versions) {
                logger.warn("Failed to fetch Paper-based core list");
                return false;
            }

            logger.info("PaperCore Version Data", data, core, url);
            return data.versions.reverse();
        } catch (error) {
            logger.error("Error fetching Paper core versions:", error);
            return false;
        }
    }

    /**
     * Obtiene todas las versiones de Magma.
     * @returns Lista de versiones o `false` si falla.
     */
    static async getAllMagmaCores(): Promise<string[] | false> {
        try {
            const data: string[] = await getDataByURL("https://api.magmafoundation.org/api/v2/allVersions");
            if (!data) {
                logger.warn("Failed to fetch Magma versions");
                return false;
            }
            return data;
        } catch (error) {
            logger.error("Error fetching Magma versions:", error);
            return false;
        }
    }

    /**
     * Obtiene todas las versiones de Purpur.
     * @returns Lista de versiones o `false` si falla.
     */
    static async getAllPurpurCores(): Promise<string[] | false> {
        try {
            const data: PurpurData = await getDataByURL("https://api.purpurmc.org/v2/purpur/");
            if (!data || !data.versions) {
                logger.warn("Failed to fetch Purpur versions");
                return false;
            }
            return data.versions.reverse();
        } catch (error) {
            logger.error("Error fetching Purpur versions:", error);
            return false;
        }
    }

    /**
     * Obtiene todas las versiones desde una API externa.
     * @param url - URL de la API externa.
     * @param name - Nombre del core.
     * @returns Lista de versiones o `false` si falla.
     */
    static async getAllCoresByExternalURL(url: string, name: string): Promise<string[] | false> {
        try {
            logger.info("Fetching external cores", {url}, name);
            const data: ExternalCoreData = await getDataByURL(url);

            if (!data || typeof data !== 'object') {
                logger.warn("Invalid external core API response", {url}, data);
                return false;
            }

            const resultList = Object.keys(data);
            logger.info("External core versions retrieved", {url}, resultList, name);
            return resultList;
        } catch (error) {
            logger.error("Error fetching external core versions:", error);
            return false;
        }
    }
}

export default CoreDownloader;
export type {
    PaperBuildData,
    PaperBuildInfo,
    PaperProjectData,
    PurpurData,
    ExternalCoreData,
    CallbackFunction
};