import { Input, InputOptions } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/input.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.3/ansi/colors.ts";

interface JSM_Array{
    type: 'array',
    items: {
        emum: Array<string>,
        default?: Array<string>
    },
    description: string,
    title: string,
    $comment?: string
}

interface JSM_Bool{
    type: 'boolean',
    default: boolean,
    description: string,
    title: string,
    $comment?: string
}

interface JSM_Str{
    type: 'string',
    default: string,
    description: string,
    title: string,
    $comment?: string
}

type JSM_Obj = {
    properties: Record<string,JSM_Array|JSM_Bool|JSM_Str|JSM_Obj>,
    type: 'object',
    required?: Array<string>,
    description: string,
    title: string,
    $comment?: string
}

export default async function askMe(question:JSM_Obj,indent = 0){
    if(question.title)
        colors.bgBlue.white.bold(question.title);
    const res:Record<string,any> = {};

    for(const key in question.properties){
        const item = question.properties[key];
        if(!item.title) continue;
        if(item.$comment && item.$comment.startsWith('eval:')){
            try{
                if(!new Function(item.$comment.substring(5)).apply(res))
                    continue;
            }catch(e){
                console.debug(e.message,'at',key);
            }
        }
        let result;
        switch(item.type){
            case "string":
                result = await Input.prompt({
                    "default": item.default,
                    "indent": new Array(indent + 1).join(" "),
                    "message": item.title
                });
            break;

            case "boolean":
                result = (await Input.prompt({
                    "default": "n",
                    "indent": new Array(indent + 1).join(" "),
                    "message": item.title,
                    "suggestions": ["y","n"]
                })) == 'y';
            break;

            case "array":
                result = [];
                console.log(colors.bgBlack.brightWhite('Array(Enter to Continue) >>'),item.title);
                for(let i = 1 ;; i++){
                    const data = await Input.prompt({
                        "indent": new Array(indent + 1).join(" "),
                        "message": i.toString(),
                        "suggestions": item.items.emum
                    });
                    if(data == '')
                        break;
                    else
                        result.push(data);
                }
            break;

            case "object":
                await askMe(item,indent + 4);
            break;
        }

        if(result) res[key] = result;
    }
    return res;
}

if(import.meta.main)
    askMe(JSON.parse(await Deno.readTextFile(Deno.args[0])),0);