import prompt from './vendor/prompt.ts';
import { mkWinB } from './vendor/mkwinb.ts';
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.3/ansi/colors.ts";
import { Input } from 'https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/input.ts';
import { exists } from "https://deno.land/std@0.216.0/fs/exists.ts";

console.clear()
console.log(colors.bgBlue.brightWhite.bold(" ------>>> 欢迎来到自动设置 <<<------ "));

try{
    var data = JSON.parse(await Deno.readTextFile('./application-schema.json'));
}catch{
    console.error('failed to read SCHEMA.Does the "application-schema.json" exists?');
}

Deno.chdir(await Input.prompt({
    "message": 'Please tell us the WORKING DIRECTOR',
    "default": './src/'
}));

const start = Date.now();
let meta;
    
if(await exists('_cache.json')){
    meta = JSON.parse(await Deno.readTextFile('_cache.json'));
}else{
    meta = await prompt(data);
    if(await Input.prompt("DO you want to cache your decision(Wrap to ESC)"))
        Deno.writeTextFile('_cache.json',JSON.stringify(meta));
}

await mkWinB({
    "out": await Input.prompt({
            "message": 'Please tell us the OUTPUT PATH',
            "default": 'application.winb'
        }),
    "meta": meta as any
});

console.log(colors.bgBlue.brightWhite.bold(" ------>>> 成功生成！耗时" + (Date.now() - start) / 1000 +"s <<<------ "));