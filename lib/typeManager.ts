import fs from 'fs'

import { gen_real_path } from './lib'

export type Type =
| {kind: "number"}
| {kind: "string"}
| {kind: "array", base_type: Type}
| {kind: "obj", pros: [string, Type][]}; // Object


const type_strs = new Map<string, string>();

// type_strsに新たなtype_strを追加する
const add_type_str = (type_path: string): string | undefined => {
    const file_and_real_path = gen_real_path(type_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'type') {
        console.log("type path is wrong");
        return undefined;
    }

    const type_str: string = JSON.parse(fs.readFileSync(file_and_real_path.real_path).toString());
    type_strs.set(type_path, type_str);
    return type_str;
}

// type_strsから目的のtype_strを取得する
export const get_type_str = (type_path: string): string | undefined => {
    const type_str = type_strs.get(type_path);
    if(type_str === undefined) return add_type_str(type_path);
    return type_str;
}

// type_strsに新たにtype_strを登録してファイルも上書き保存
export const set_type_str = (type_path: string, new_type_str: string) => {
    const file_and_real_path = gen_real_path(type_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'type') {
        console.log("type path is wrong");
        return false;
    }

    //if(type_str_to_type(new_type_str) === undefined) return false;
    type_strs.set(type_path, new_type_str);
    fs.writeFileSync(file_and_real_path.real_path, JSON.stringify(new_type_str));
    return true;
}

// type_strからTypeに変換する
export const type_str_to_type = (type_str: string): Type | undefined => {
    // Tokenize 
    const tokens: string[] = [];
    const signs = ["{", "}", ":", ",", "[", "]"];

    const is_num = (char: string) => ('0' <= char && char <= '9');
    const is_alpha = (char: string) => ('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z');
    
    content: for(var i = 0; i < type_str.length; i++) {
        // space or indention
        if(type_str.charAt(i) === ' ' || type_str.charAt(i) === '\n') continue;

        // sign token
        for(const sign of signs) {
            if(type_str.charAt(i) === sign) {
                tokens.push(sign);
                continue content;
            }
        }

        // normal token
        if(is_alpha(type_str.charAt(i)) || type_str.charAt(i) === '_') {
            let normal = type_str.charAt(i);
            while(i + 1 < type_str.length && (is_alpha(type_str.charAt(i + 1)) || is_num(type_str.charAt(i + 1)) || type_str.charAt(i + 1) === '_')) {
                normal += type_str.charAt(++i);
            }
            tokens.push(normal);
            continue;
        }

        return undefined;
    }

    var i = 0

    const is_end = () => (tokens.length <= i);
    const is_keyword = (keyword: string) => (!is_end() && tokens[i] === keyword);
    const get_ident = () => ((!is_end() && (is_alpha(tokens[i].charAt(0)) || tokens[i].charAt(0) === '_')) ? tokens[i] : undefined);

    const expr = (): Type | undefined => {
        const expr = array();
        if(is_end()) return expr;
        return undefined;
    }

    const array = (): Type | undefined => {
        // array
        var array = obj();
        if(array === undefined) return undefined;
        while(is_keyword("[")) {
            i++;
            if(is_keyword("]")) {
                i++;
                array = {kind: "array", base_type: array};
                continue;
            }
            return undefined;
        }
        return array;
    }

    const obj = (): Type | undefined => {
        // obj
        if(is_keyword("{")) {
            i++;
            const pros: Map<string, Type> = new Map();
            while(!is_keyword("}")) {
                const key_name = get_ident();
                if(key_name === undefined) return undefined;
                if(pros.has(key_name)) return undefined;
                i++;
                if(is_keyword(":")) {
                    i++;
                    const value_type = array();
                    if(value_type === undefined) return undefined;
                    if(is_keyword(",")) i++;
                    else if(!is_keyword("}")) return undefined;
                    pros.set(key_name, value_type);
                    continue;
                }
                return undefined;
            }
            i++;
            return {kind: "obj", pros: Array.from(pros)};
        }
        return primary();
    }

    const primary = (): Type | undefined => {
        // number
        if(is_keyword("number")) {
            i++;
            return {kind: "number"}
        }
        // string
        if(is_keyword("string")) {
            i++;
            return {kind: "string"}
        }
        return undefined
    }

    return expr();
}

// Type判定
export const is_same_type = (a: Type, b: Type): boolean => {
    switch(a.kind) {
        case "array":
            return b.kind === "array" && is_same_type(a.base_type, b.base_type);
        case "obj":
            if(b.kind === "obj" && a.pros.length == b.pros.length) {
                for(let i = 0; i < a.pros.length; i++) {
                    if(a.pros[i][0] === b.pros[i][0]) {
                        if(!is_same_type(a.pros[i][1], b.pros[i][1])) return false;
                    } else {
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
    }
    return a.kind === b.kind;
}

// Typeからシンプルなtype_strに変換する
const type_to_simple_type_str = (type: Type): string => {
    switch(type.kind) {
        case "array":
            return type_to_simple_type_str(type.base_type) + "[]";
        case "obj":
            return "{" + type.pros.map(([key_name, value_type], index) => {
                return (index > 0 ? " " : "") + key_name + ": " + type_to_simple_type_str(value_type)
            }) + "}";
        default:
            return type.kind;
    }
}

// Typeからシンプルなdata_strに変換する
export const type_to_simple_data_str = (type: Type): string => {
    switch(type.kind) {
        case "number":
            return "0";
        case "string":
            return "\"\"";
        case "array":
            return "[] of " + type_to_simple_type_str(type.base_type);
        default:
            return "{" + type.pros.map(([key_name, value_type], index) => {
                return (index > 0 ? " " : "") + key_name + ": " + type_to_simple_data_str(value_type)
            }) + "}";
    }
}