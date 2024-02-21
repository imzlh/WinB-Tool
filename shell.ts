import { exists } from "https://deno.land/std@0.216.0/fs/exists.ts";
import WinBArchive from "./vendor/winb.ts";
import { Table } from "https://deno.land/x/cliffy@v1.0.0-rc.3/table/mod.ts"
import { readFrom } from './vendor/reader.ts';
import { ensureDir } from 'https://deno.land/std@0.216.0/fs/ensure_dir.ts';
import { dirname } from "https://deno.land/std@0.196.0/path/mod.ts";
import { basename } from "https://deno.land/std@0.216.0/path/basename.ts";

if(typeof Deno.args[0] != 'string' || !await exists(Deno.args[0]))
    throw new Error('Target file not exists');

class WinBCommand extends WinBArchive{
    static MAX_TEXT = 16 * 1024;

    info(){
        const meta = this.$meta,table:Array<[string,string]> = [];
        for (const key in meta)
            table.push([key,meta[key].toString()]);
        return new Table(...table).sort().toString();
    }

    async cat(name: string, start?:string, end?:string) {
        const buf = await super.read(name,start ? [parseInt(start),end ? parseInt(end) : undefined] : undefined);
        const data = await readFrom(buf);
        if(data.byteLength > WinBCommand.MAX_TEXT){
            Deno.writeFile('temp.bin',data);
            return ('The File is tool big.We have extrated it to "TEMP.BIN"');
        }else{
            return new TextDecoder().decode(data);
        }
    }

    async extrat(name:string, path:string){
        await ensureDir(dirname(path));
        const start = Date.now();
        await Deno.writeFile(path,await super.read(name));
        return `Finished in ${(Date.now() - start) / 1000}s`;
    }

    async ls(path:string){
        let str = '';
        for await (const file of super.list(path || '/'))
            str += `${file}\n`;
        return str;
    }

    async add(fpath:string,to?:string){
        await super.write_sync(to ?? basename(fpath),await Deno.readFile(fpath));
    }
}

const app = await new WinBCommand(Deno.args[0],true).open() as Record<string,any>;
console.log('Repl shell mode.');

while(true){
    const command = prompt('>>>');
    if(!command) continue;
    const commands = command.split(/\s+/i),
        exec = commands.shift() as string;
    if(exec.toLowerCase() == 'exit') Deno.exit(parseInt(commands[2] || '0'))
    try{
        if(typeof app[exec] == 'function') console.log(await app[exec](...commands));
        else console.error(exec + ' not exists.');
    }catch(e){
        console.error(e.message);
    } 
}