/** ffprobe-static 类型声明（包内无自带类型） */
declare module 'ffprobe-static' {
  const ffprobe: {
    /** ffprobe 可执行文件路径 */
    path: string;
    version: string;
  };
  export default ffprobe;
}
