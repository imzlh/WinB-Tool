/**
 * WinB 格式解码器
 * @copyright izGroup
 * @version 1.0
 */

import { read,readFrom } from "./reader.ts";

interface WinBHeader{
    "meta":Record<string,string|number>,
    "alias":Record<string,string>,
    "files":Record<string,[number,number]>
}

export default class WinBArchive{

    static readonly PREREAD_SIZE = 4;

    readonly $file;
    protected $fd?:Deno.FsFile;
    private $headsize = 0;
    private $size = 0;
    private $write;
    protected $files:Record<string,[number,number]> = {};
    protected $alias:Record<string,[number,number]> = {};
    protected $meta:Record<string,string|number> = {};

    /**
     * 初始化WinB文件
     * @param file 文件路径
     */
    constructor(file:string,write = false){
        this.$file = file;
        this.$write = write;
    }

    /**
     * 打开由 `new()` 指定的文件
     */
    async open(){
        this.$fd = await Deno.open(this.$file,{
            create: false,
            read: true,
            write: this.$write
        });
        this.$size = (await this.$fd.stat()).size;
        await this._readHeader();
        return this;
    }

    // 读取头长度
    private async _readBitLength(){
        const f = this.$fd as Deno.FsFile,
            reader = new Uint8Array(WinBArchive.PREREAD_SIZE);
        await f.seek(0,Deno.SeekMode.Start);
        await f.read(reader);
        // 获取头长度
        return new DataView(reader.buffer).getUint32(0);
    }

    private async _readHeader(){
        if(!this.$fd) await this.open();
        const length = this.$headsize = await this._readBitLength(),
            f = this.$fd as Deno.FsFile,
            reader = new Uint8Array(length),
            decoder = new TextDecoder();
        if(this.$size < WinBArchive.PREREAD_SIZE + length)
            throw new Error('文件头损坏: 实际大小'+this.$size+' < '+(WinBArchive.PREREAD_SIZE+length));
        await f.seek(WinBArchive.PREREAD_SIZE,Deno.SeekMode.Start);
        await f.read(reader);
        try{
            const raw = decoder.decode(reader.buffer);
            const data = JSON.parse(raw);

            if(!data.files || !data.meta) throw 0;
            this.$files = data.files;
            this.$meta = data.meta;

            if(data.alias) for (const key in data.alias) {
                const file = data.alias[key];
                if(file in data.files) this.$alias[key] = data.files[file];
                else console.warn('警告[alias]: ',key,'->',file,'不存在');
            }
        }catch{
            throw new TypeError('文件存在无效数据: 文件头读取失败(长度:'+length+')');
        }
    }

    /**
     * 获取`.winb`文件的元数据
     */
    get meta(){
        if(!this.$fd) throw new Error('请先初始化');
        return this.$meta;
    }

    private _packPath(path:string,isfile = false){
        let cache = path.replaceAll('//','/').replaceAll('/./','/').replaceAll('\\','/').replaceAll(/\/[a-z0-9_\-]+\/\.\.\//gi,'/');
        if(!cache.startsWith('/')) cache = '/' + cache;
        // 这条三次三元很好理解吧...
        return cache.endsWith('/') ? (isfile ? cache.substring(0,cache.length -1) : cache) : (isfile ? cache : cache + '/');
    }

    /**
     * 从存档中读取一个文件
     * `.winb`文件没有压缩任何数据，因此如同读取本地文件一样快速
     * @example
     * const file = await new WinBArchive('./app.winb').open();
     * file.read('/test.txt',[10,30]);  // 注意:返回一个ReadableStream
     * @param name 存档中的文件名
     * @param param1 指定起始位、结束位
     * @returns 数据流
     */
    async read(name:string,[start,end]:[number,number|undefined] = [0,undefined]){
        if(!this.$fd) await this.open();
        const range = this.$files[this._packPath(name,true)],
            f = this.$fd as Deno.FsFile;
        if(!range) throw new Error('文件未找到:'+name);
        const length = range[1] - range[0];
        if(start >= length || (end &&( end > length || start > end)))
            throw new Error('无法获取区间数据: 无效的区间 '+start+' -> '+end);
        const minSize = end || range[1];
        if(this.$size < minSize)
            throw new Error('文件数据损坏: 实际大小'+length+' < '+minSize);

        // WinB的位置是相对于body部分来算的
        const startPos = start + range[0] + this.$headsize + WinBArchive.PREREAD_SIZE;
        await f.seek(startPos ,Deno.SeekMode.Start);
        return read(length,f);
    }

    /**
     * 列举所有符合路径文件
     * @param name 路径
     */
    async* list(name:string):AsyncGenerator<string>{
        if(!this.$fd) await this.open();
        const path = this._packPath(name);
        for (const key in this.$files)
            if(key.startsWith(path)) yield key; 
    }

    async write_sync(file?:string,data?:Uint8Array){
        if(!this.$write) throw new Error('此副本只读.');

        const f = this.$fd as Deno.FsFile;
        this._test(data?.byteLength || 0);

        // 包装原先数据
        const encoder = new TextEncoder();
        // head
        if(file && data) this.$files[file] = [this.$size,data.byteLength + this.$size];
        const head = encoder.encode(JSON.stringify({
            "meta": this.$meta,
            "files": this.$files,
            "alias": this.$alias
        }));
        // preread
        const pread = new Uint8Array(WinBArchive.PREREAD_SIZE);
        for(let i = 0; i < WinBArchive.PREREAD_SIZE; i++)
            pread.set([ head.length / 0x100 ** i ], WinBArchive.PREREAD_SIZE -1 - i);
        // 写入
        await f.seek(0,Deno.SeekMode.Start);
        await f.write(pread);   // pread头
        await f.write(head);    // 元数据
        for (const file in this.$files)
            if(this.$files[file])   // 搬迁文件
                await f.write(await readFrom(await this.read(file)));
        if(data) await f.write(data);    // 新数据
    }

    private _test(length:number){
        const usage = Deno.memoryUsage(),
            sysfree = Deno.systemMemoryInfo().free,
            free = usage.heapTotal - usage.heapUsed,
            require = (length + this.$size) * 1.5;
        if(require > free || require > sysfree)
            throw new Error('内存不足，无法继续');
    }
}