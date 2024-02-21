import { concat } from "https://deno.land/std/bytes/mod.ts";
import { parseArgs } from "https://deno.land/std/cli/parse_args.ts";
import { basename } from "https://deno.land/std/path/basename.ts";

interface mkWinBOpt{
    meta: Record<string,any>,
    out: string
}

export async function mkWinB(opt:mkWinBOpt){
    const fileList:Array<Uint8Array> = [],
        body = await Deno.readFile(opt.meta.icon),
        script = await Deno.readFile(opt.meta.entry),
        head = new TextEncoder().encode(JSON.stringify({
            "meta": opt.meta,
            "files": await (async function(){
                let startByte = body.byteLength + script.byteLength;
                const data:Record<string,[number,number]> = {
                    ['/' + basename(opt.meta.icon)]:[0,body.byteLength],
                    "/index.js":[body.byteLength,startByte]
                };
                if(opt.meta.includes)
                    for (const fname of (opt.meta.includes as Array<string>)) {
                        const file = await Deno.readFile(fname);
                        data['/' + fname] = [startByte,startByte + file.byteLength];
                        startByte = startByte + file.byteLength;
                        fileList.push(file);
                    }
                return data;
            })(),
            "alias": {}
        })),
        pread = new Uint8Array(4);
        for(let i = 0; i < 4; i++)
            pread.set([ head.length / 0x100 ** i ], 3 - i);
        
    await Deno.writeFile(opt.out,concat([pread,head,body,script,...fileList]));
    console.log('Complete!');
}

if(import.meta.main){
    const args = parseArgs(Deno.args);
    if(args['help'] || args['_'].indexOf('h') != -1){
        console.log(`创建Winb包，可选参数
--name={包名}
--version={版本号，如0.1}
--icon={图标位置}
--output={输出位置}

MIT License`);
        Deno.exit();
    }
    mkWinB({
        meta: {
            name: args.name || '无名WinB包',
            version: args.version || '0.1',
            icon: args.icon || import.meta.dirname + '/static/icon.webp'
        },
        out: args.output || 'out.winb'
    })
}