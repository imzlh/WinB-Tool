import { concat } from "https://deno.land/std@0.216.0/bytes/concat.ts";
/**
 * 从 `Deno.open()` 打开的文件读取指定长度
 * 返回一个 `ReadableStream`，这意味着可以很方便地 `pipeTo` 其他地方
 * 
 * @param length 读取长度
 * @param handle `Deno.open()` 打开的文件
 * @param buffer 每次读取的长度，太大占用内存较多，太小CPU开销大
 * @returns 一个数据流
 */
export function read(length:number,handle:Deno.FsFile,buffer:number = 512 * 1024,callback?:Function):ReadableStream<Uint8Array>{
    return new ReadableStream({
        async pull(ctrl){
            if(length == 0) return ctrl.close();
            
            let readed = 0; // 已读取
            while(true){
                let u8length = buffer;
                // 剩余补偿
                if(readed + buffer > length) u8length = length - readed;
                const u8 = new Uint8Array(u8length),
                    read = await handle.read(u8);
                if(!read) {          // 读完了
                    if(callback) callback();
                    return ctrl.close();
                }
                // 判断是否有多余数据
                ctrl.enqueue(read < u8length ? u8.subarray(0,read) : u8 );
                // 判断是否可以结束
                readed += u8length;
                if(readed >= length){
                    if(callback) callback();
                    return ctrl.close();
                }
            }       
        }
    });
}

/**
 * 从 `Deno.open()` 打开的文件全部读取
 * 相比`readable`属性，此函数可以多次使用
 * 
 * @param handle `Deno.open()` 打开的文件
 * @param buffer 每次读取的长度，太大占用内存较多，太小CPU开销大
 * @returns 一个Blob
 */
export async function readAll(handle:Deno.FsFile,buffer:number = 512 * 1024){
    const chunk = [];
    while(true){
        const u8 = new Uint8Array(buffer);
        if(!await handle.read(u8)) break;
        chunk.push(u8);
    }
    return concat(chunk);
}

/**
 * 全部读取ReadableStream的数据
 * 
 * @param handle 一个stream
 * @param buffer 每次读取的长度，太大占用内存较多，太小CPU开销大
 * @returns 一个Blob
 */
export async function readFrom(stream:ReadableStream<Uint8Array>){
    const chunk = [],reader = stream.getReader();
    while(true){
        const res = await reader.read();
        if(res.done) break;
        chunk.push(res.value);
    }
    return concat(chunk);
}

/**
 * 将ReadableStream转换为Blob
 * @param stream ReadableStream数据
 * @returns Blob数据
 */
export async function toBlob(stream:ReadableStream){
    const reader = stream.getReader(),
        chunk = [];
    while(true){
        const data = await reader.read();
        if(data.done) break;
        chunk.push(data.value);
    }
    return new Blob(chunk);
}