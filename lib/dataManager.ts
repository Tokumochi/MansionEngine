import fs from 'fs'

import { gen_real_path } from './lib'
import { is_same_type, Type } from './typeManager'
import { alpha_keywords } from './genInst';

const data_strs = new Map<string, string>();

// data_strsに新たなdata_strを追加する
const add_data_str = (data_path: string): string | undefined => {
    const file_and_real_path = gen_real_path(data_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'data') {
        console.log("data path is wrong");
        return undefined;
    }

    const data_str: string = JSON.parse(fs.readFileSync(file_and_real_path.real_path).toString());
    data_strs.set(data_path, data_str);
    return data_str;
}

// data_strsから目的のdata_strを取得する
export const get_data_str = (data_path: string): string | undefined => {
    const data_str = data_strs.get(data_path);
    if(data_str === undefined) return add_data_str(data_path);
    return data_str;
}

// data_strsにあるpathのdata_strが既に含まれているか
export const has_joined_data_str = (data_path: string): boolean => {
    return data_strs.has(data_path);
}

// data_strsに新たにdata_strを登録してファイルも上書き保存
export const set_data_str = (data_path: string, new_data_str: string) => {
    const file_and_real_path = gen_real_path(data_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'data') {
        console.log("type path is wrong");
        return false;
    }

    //if(data_str_to_type_and_data(new_data_str) === undefined) return false;
    data_strs.set(data_path, new_data_str);
    fs.writeFileSync(file_and_real_path.real_path, JSON.stringify(new_data_str));
    return true;
}

// data_strからTypeとデータ(any)に変換する
export const data_str_to_type_and_data = (data_str: string): [Type, any] | undefined => {
    // Tokenize 
    type Token = 
        | {kind: "KEYWORD", keyword: string}
        | {kind: "IDENT", ident: string}
        | {kind: "NUM", num: number}
        | {kind: "STR", str: string}

    const tokens: Token[] = [];
    const keywords = ["{", "}", ":", ",", "[", "]"];

    const is_num = (char: string) => ('0' <= char && char <= '9');
    const is_alpha = (char: string) => ('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z');

    content: for(var i = 0; i < data_str.length; i++) {
        // space or indention
        if(data_str.charAt(i) === ' ' || data_str.charAt(i) === '\n') continue;

        // keyword
        for(const keyword of keywords) {
            if(data_str.charAt(i) === keyword) {
                tokens.push({kind: "KEYWORD", keyword: keyword});
                continue content;
            }
        }

        // identifier
        if(is_alpha(data_str.charAt(i)) || data_str.charAt(i) === '_') {
            let ident = data_str.charAt(i);
            while(i + 1 < data_str.length && (is_alpha(data_str.charAt(i + 1)) || is_num(data_str.charAt(i + 1)) || data_str.charAt(i + 1) === '_')) {
                ident += data_str.charAt(++i);
            }
            for(const keyword of alpha_keywords) {
                if(ident === keyword) return undefined;
            }
            tokens.push({kind: "IDENT", ident: ident});
            continue;
        }

        // number
        if(is_num(data_str.charAt(i))) {
            var num = data_str.charAt(i);
            while(i + 1 < data_str.length && is_num(data_str.charAt(i + 1))) {
                num += data_str.charAt(++i);
            }
            tokens.push({kind: "NUM", num: parseInt(num)});
            continue;
        }

        // string
        if(data_str.charAt(i) == '"') {
            var str = "";
            while(i + 1 < data_str.length && data_str.charAt(++i) !== '"') {
                str += data_str.charAt(i);
            }
            tokens.push({kind: "STR", str: str});
            continue;
        }

        return undefined;
    }

    var i = 0

    const is_end = () => (tokens.length <= i);
    const is_keyword = (keyword: string) => {
        if(!is_end()) {
            const token = tokens[i];
            if(token.kind === "KEYWORD") return token.keyword === keyword;
            else if(token.kind === "IDENT") return token.ident === keyword;
        }
        return false;
    }
    const get_ident = () => {
        if(!is_end()) {
            const token = tokens[i];
            if(token.kind === "IDENT") return token.ident;
        }
        return undefined;
    }
    const get_num = () => {
        if(!is_end()) {
            const token = tokens[i];
            if(token.kind === "NUM") return token.num;
        }
        return undefined;
    }
    const get_str = () => {
        if(!is_end()) {
            const token = tokens[i];
            if(token.kind === "STR") return token.str;
        }
        return undefined;
    }

    const expr = (): [Type, any] | undefined => {
        const expr = array();
        if(is_end()) return expr;
        return undefined;
    }

    const array = (): [Type, any] | undefined => {

        const type_array = (): Type | undefined => {
            // type_array
            var array = type_obj();
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

        const type_obj = (): Type | undefined => {
            // type_obj
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
                        const value_type = type_array();
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
            return type_primary();
        }

        const type_primary = (): Type | undefined => {
            // type_number
            if(is_keyword("number")) {
                i++;
                return {kind: "number"}
            }
            // type_string
            if(is_keyword("string")) {
                i++;
                return {kind: "string"}
            }
            return undefined
        }

        // array
        if(is_keyword("[")) {
            var array_type: Type | undefined = undefined;
            const array_values = [];
            i++;
            while(!is_keyword("]")) {
                if(array_type !== undefined) {
                    if(!is_keyword(",")) return undefined;
                    i++;
                }
                const type_and_value = array();
                if(type_and_value === undefined) return undefined;
                const [type, value] = type_and_value;
                if(array_type === undefined) array_type = type;
                else if(!is_same_type(array_type, type)) return undefined;
                array_values.push(value);
            }
            i++;
            if(is_keyword("of")) {
                i++;
                const declared_type = type_array();
                if(array_type === undefined) array_type = declared_type;
                else if(array_type !== declared_type) return undefined;
            }
            if(array_type === undefined) return undefined;
            return [{kind: "array", base_type: array_type}, array_values];
        }
        return obj();
    }

    const obj = (): [Type, any] | undefined => {
        // obj
        if(is_keyword("{")) {
            i++;
            const pros: Map<string, [Type, any]> = new Map();
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
            const pro_types: [string, Type][] = [];
            const pro_values: any = [];
            pros.forEach(([type, value], key_name) => {
                pro_types.push([key_name, type]);
                pro_values.push(value);
            });
            return [{kind: "obj", pros: pro_types}, pro_values];
        }
        return primary();
    }

    const primary = (): [Type, any] | undefined => {
        // number
        const num = get_num();
        if(num !== undefined) {
            i++;
            return [{kind: "number"}, num]
        }
        // string
        const str = get_str();
        if(str !== undefined) {
            i++;
            return [{kind: "string"}, str]
        }
        return undefined
    }

    return expr();
}