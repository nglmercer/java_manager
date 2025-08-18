import os from 'os';
import si from 'systeminformation';

interface CpuLoadData {
  currentLoad?: number;
}

interface MemoryData {
  total?: number;
  free?: number;
  used?: number;
}

interface TimeData {
  uptime?: number;
}

interface DiskData {
  fs?: string;
  name?: string;
  size?: number;
  used?: number;
  available?: number;
  use?: number;
  mount?: string;
  path?: string;
}

interface BatteryData {
  hasBattery?: boolean;
  cycleCount?: number;
  isCharging?: boolean;
  percent?: number;
}

interface GraphicsController {
  model?: string;
  vendor?: string;
  vram?: number;
}

interface GraphicsData {
  controllers?: GraphicsController[];
}

interface CpuData {
  brand?: string;
  manufacturer?: string;
  speed?: number;
  physicalCores?: number;
  cores?: number;
  cache?: any;
}

interface ResourceUsage {
  cpu: number;
  ram: {
    total: number;
    free: number;
    used: number;
    percent: number;
    rawmemInfo: MemoryData;
  };
}

interface HardwareInfo {
  uptime: number;
  platform: {
    name: string;
    release: string;
    arch: string;
    version: string;
  };
  totalmem: number;
  cpu: {
    model: string;
    speed: number | string;
    cores: number | string;
    cache: any;
    rawCpuInfo: CpuData;
  };
  enviroment: NodeJS.ProcessEnv;
  networkInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
  disks: Array<{
    filesystem: string;
    total: number;
    used: number;
    available: number;
    use: number;
    mount: string;
    rawDiskInfo: DiskData;
  }>;
  rawdisks: DiskData[];
  battery: {
    hasBattery: boolean;
    cycleCount: number | string;
    isCharging: boolean | string;
    percent: number | string;
    rawBatteryInfo: BatteryData;
  } | null;
  graphics: {
    controllers: Array<{
      model: string;
      vendor: string;
      vram: number;
      rawGraphicsInfo: GraphicsController;
    }>;
  } | null;
}

const isValidObject = (obj: any): boolean =>
  obj && typeof obj === 'object' && Object.keys(obj).length > 0;

const isAndroid = process.platform === 'android' || process.env.TERMUX_VERSION !== undefined;

let cachedHardwareInfo: HardwareInfo | null = null;
let hardwareInfoPromise: Promise<HardwareInfo> | null = null;

const fetchCpuAndMemoryLoad = async (): Promise<{ cpuLoad: CpuLoadData; memInfo: MemoryData }> => {
  let cpuLoad: CpuLoadData = {};
  let memInfo: MemoryData = {};

  try {
    cpuLoad = await si.currentLoad();
  } catch (e) {
    // Error handling removed
  }

  try {
    memInfo = await si.mem();
  } catch (e) {
    // Error handling removed
  }

  return { cpuLoad, memInfo };
};

const fetchDynamicData = async (): Promise<{ uptime: number; networkInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> }> => {
  let timeInfo: TimeData = {};
  
  try {
    timeInfo = await si.time();
  } catch (e) {
    // Error handling removed
  }

  const networkInterfaces = os.networkInterfaces();
  
  return {
    uptime: timeInfo.uptime ? Math.round(timeInfo.uptime) : 0,
    networkInterfaces
  };
};

const fetchStaticHardwareData = async (): Promise<{
  disks: DiskData[];
  cpuInfo: CpuData;
  timeInfo: TimeData;
  batteryInfo: BatteryData;
  graphicsInfo: GraphicsData;
}> => {
  let disks: DiskData[] = [];
  let cpuInfo: CpuData = {};
  let timeInfo: TimeData = {};
  let batteryInfo: BatteryData = {};
  let graphicsInfo: GraphicsData = {};

  const results = await Promise.allSettled([
    si.fsSize(),
    si.cpu(),
    si.time(),
    si.battery(),
    si.graphics(),
  ]);

  if (results[0].status === 'fulfilled') {
    disks = results[0].value;
    if ((!Array.isArray(disks) || disks.length === 0) && isAndroid) {
      try {
        disks = await si.blockDevices();
      } catch (e) {
        // Error handling removed
      }
    }
  }

  if (results[1].status === 'fulfilled') {
    cpuInfo = results[1].value;
  }

  if (results[2].status === 'fulfilled') {
    timeInfo = results[2].value;
  }

  if (results[3].status === 'fulfilled') {
    batteryInfo = results[3].value;
  }

  if (results[4].status === 'fulfilled') {
    graphicsInfo = { controllers: results[4].value.controllers?.map(ctrl => ({
      model: ctrl.model,
      vendor: ctrl.vendor,
      vram: ctrl.vram ?? undefined
    })) };
  }

  return { disks, cpuInfo, timeInfo, batteryInfo, graphicsInfo };
};

export const getResourcesUsage = async (): Promise<ResourceUsage> => {
  const { cpuLoad, memInfo } = await fetchCpuAndMemoryLoad();

  if (!isValidObject(memInfo)) {
    throw new Error('Incomplete or invalid memory data');
  }

  const usage: ResourceUsage = {
    cpu: Math.round(cpuLoad.currentLoad ?? 0),
    ram: {
      total: memInfo.total ?? 0,
      free: memInfo.free ?? 0,
      used: memInfo.used ?? 0,
      percent: (memInfo.total && memInfo.used)
        ? Math.round((memInfo.used / memInfo.total) * 100)
        : 0,
      rawmemInfo: memInfo,
    },
  };

  return usage;
};

export const getHardwareInfo = async (): Promise<HardwareInfo> => {
  const dynamicData = await fetchDynamicData();
  
  if (cachedHardwareInfo) {
    return {
      ...cachedHardwareInfo,
      uptime: dynamicData.uptime,
      networkInterfaces: dynamicData.networkInterfaces
    };
  }

  if (hardwareInfoPromise) {
    const hardwareInfo = await hardwareInfoPromise;
    return {
      ...hardwareInfo,
      uptime: dynamicData.uptime,
      networkInterfaces: dynamicData.networkInterfaces
    };
  }
  
  hardwareInfoPromise = (async (): Promise<HardwareInfo> => {
    try {
      const { disks, cpuInfo, timeInfo, batteryInfo, graphicsInfo } =
        await fetchStaticHardwareData();

      if (!isValidObject(cpuInfo)) throw new Error('Incomplete or invalid CPU data');
      if (!isValidObject(timeInfo)) throw new Error('Incomplete or invalid Time data');

      const info: HardwareInfo = {
        uptime: timeInfo.uptime ? Math.round(timeInfo.uptime) : 0,
        platform: {
          name: os.type(),
          release: os.release(),
          arch: process.arch,
          version: typeof os.version === 'function' ? os.version() : 'N/A',
        },
        totalmem: os.totalmem() ? Math.round(os.totalmem() / 1024 / 1024) : 0,
        cpu: {
          model: cpuInfo.brand || cpuInfo.manufacturer || 'N/A',
          speed: cpuInfo.speed || 'N/A',
          cores: cpuInfo.physicalCores || cpuInfo.cores || 'N/A',
          cache: cpuInfo.cache || {},
          rawCpuInfo: cpuInfo,
        },
        enviroment: process.env,
        networkInterfaces: os.networkInterfaces(),
        disks: [],
        rawdisks: [],
        battery: null,
        graphics: null,
      };

      if (Array.isArray(disks) && disks.length > 0) {
        info.disks = disks.map((disk) => ({
          filesystem: disk.fs || disk.name || 'N/A',
          total: disk.size || 0,
          used: disk.used || 0,
          available: disk.available || (disk.size && disk.used ? disk.size - disk.used : 0),
          use: disk.use || (disk.size && disk.used ? parseFloat(((disk.used / disk.size) * 100).toFixed(2)) : 0),
          mount: disk.mount || disk.path || 'N/A',
          rawDiskInfo: disk,
        }));
        info.rawdisks = disks;
      }

      if (isValidObject(batteryInfo) && typeof batteryInfo.hasBattery !== 'undefined') {
        info.battery = {
          hasBattery: batteryInfo.hasBattery!,
          cycleCount: batteryInfo.cycleCount ?? 'N/A',
          isCharging: batteryInfo.isCharging ?? 'N/A',
          percent: batteryInfo.percent ?? 'N/A',
          rawBatteryInfo: batteryInfo,
        };
      }

      if (
        isValidObject(graphicsInfo) &&
        Array.isArray(graphicsInfo.controllers) &&
        graphicsInfo.controllers!.length > 0
      ) {
        info.graphics = {
          controllers: graphicsInfo.controllers!.map((ctrl) => ({
            model: ctrl.model || 'N/A',
            vendor: ctrl.vendor || 'N/A',
            vram: ctrl.vram || 0,
            rawGraphicsInfo: ctrl,
          })),
        };
      }

      cachedHardwareInfo = info;
      return info;
    } catch (error) {
      hardwareInfoPromise = null;
      throw error;
    }
  })();

  const hardwareInfo = await hardwareInfoPromise;
  
  return {
    ...hardwareInfo,
    uptime: dynamicData.uptime,
    networkInterfaces: dynamicData.networkInterfaces
  };
};

export const resetHardwareInfoCache = (): void => {
  cachedHardwareInfo = null;
  hardwareInfoPromise = null;
};