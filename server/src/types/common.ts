export enum VersionStatus {
  deprecated = 0, // 已废弃
  normal = 1 // 正常
}
export interface Version {
  id: string; // 版本id
  name: string; // 版本名称
  status: number; // 版本状态
  publishTime: number; // 版本创建时间
  readmeDoc: string; // 介绍文档
  buildDoc: string; // 部署文档
  updateDoc: string; // 更新文档
}
export interface DirNode {
  name: string;
  filePath: string;
  fileType?: string;
  isDirectory: boolean;
  children: DirNode[];
}