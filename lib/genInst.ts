import { is_same_type, Type, type_str_to_type } from "./typeManager";
import { Process } from "./processManager"

type Token = ({kind: "KEYWORD", keyword: string} |
              {kind: "IDENT", ident: string} |
              {kind: "STR", str: string} |
              {kind: "NUM", num: number}) &
              {line_num: number, col_num: number}

type StoreKind = "STORE" | "ADDSTORE" | "SUBSTORE" | "PUSHSTORE"
type BinaryKind = "EQU" | "NEQ" | "ELT" | "EGT" | "LT" | "GT" | "ADD" | "SUB" | "MUL" | "DIV"
type PressedKind = "W" | "A" | "S" | "D" | "SPACE"

type ExprInst = {kind: "LOAD", var_indexes: ExprInst[]} |
                {kind: StoreKind, var_indexes: ExprInst[], value: ExprInst} |
                {kind: BinaryKind, left: ExprInst, right: ExprInst} |
                {kind: "OBJ", pro_values: ExprInst[]} |
                {kind: "STR", str: string} |
                {kind: "NUM", num: number} |
                {kind: "PRINT", value: ExprInst} |
                {kind: "DRAWCIRCLE", radius: ExprInst, x: ExprInst, y: ExprInst, color: ExprInst} |
                {kind: PressedKind}

export type StmtInst = {kind: "EXPR", expr: ExprInst} |
                       {kind: "BLOCK", stmts: StmtInst[]} |
                       {kind: "IF" | "WHILE", cond: ExprInst, if: StmtInst}

type ErrorResult = {error: true, line_num: number, col_num: number, message: string}
type TokenizeResult = {error: false, tokens: Token[]} | ErrorResult
type ExprResult = {error: false, expr: ExprInst, type: Type} | ErrorResult
type StmtResult = {error: false, stmt: StmtInst} | ErrorResult


export const alpha_keywords = ["__print__", "__draw_circle__",
                               "__W__", "__A__", "__S__", "__D__", "__SPACE__",
                               "if", "while"];

const sign_keywords = ["==", "!=", "<=", ">=", "+=", "-=",
                       "<", ">", "+", "-", "*", "/", "=",
                       "(", ")", "{", "}", "[", "]",
                       ":", ",", "."];

const genErrorMessage = (code: string, line_num: number, col_num: number, message: string): string => {
    return (line_num + 1) + ":" + (col_num + 1) + '\n'
        + code.split('\n')[line_num] + '\n'
        + ' '.repeat(col_num) + '^ ' + message;
}

export const genProcessInst = (process: Process): {is_error: false, stmt: StmtInst} | {is_error: true, error_message: string} => {
    const declared_vars: {name: string, type: Type}[] = [];

    const param_obj_type = type_str_to_type(process.params_str);
    if(param_obj_type === undefined) {
        console.log("can't compile params str");
        return {is_error: true, error_message: "can't compile params str"}
    }
    if(param_obj_type.kind !== 'obj') {
        console.log("params str' kind is not obj");
        return {is_error: true, error_message: "params str' kind is not obj"}
    }
    const ret_obj_type = type_str_to_type(process.rets_str);
    if(ret_obj_type === undefined) {
        console.log("can't compile rets str");
        return {is_error: true, error_message: "can't compile rets str"}
    }
    if(ret_obj_type.kind !== 'obj') {
        console.log("rets str' kind is not obj");
        return {is_error: true, error_message: "rets str' kind is not obj"}
    }
    for(const pro of param_obj_type.pros) declared_vars.push({name: pro[0], type: pro[1]});
    for(const pro of ret_obj_type.pros) declared_vars.push({name: pro[0], type: pro[1]});

    const tokenize_result = Tokenize(process.code);
    if(tokenize_result.error) return {is_error: true, error_message: genErrorMessage(process.code, tokenize_result.line_num, tokenize_result.col_num, tokenize_result.message)};

    const top_stmt = Parse(tokenize_result.tokens, declared_vars);
    if(top_stmt.error) return {is_error: true, error_message: genErrorMessage(process.code, top_stmt.line_num, top_stmt.col_num, top_stmt.message)};

    return {is_error: false, stmt: top_stmt.stmt};
}

const Tokenize = (code: string): TokenizeResult => {
    const tokens: Token[] = [];

    const is_num = (char: string) => ('0' <= char && char <= '9');
    const is_alpha = (char: string) => ('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z');

    let line_num = 0;
    let len_upto_pre_line = 0;

    content: for(let i = 0; i < code.length; i++) {
        // space
        if(code.charAt(i) === ' ') continue;

        // \n
        if(code.charAt(i) === '\n') {
            tokens.push({kind: "KEYWORD", keyword: '\n', line_num: line_num++, col_num: i - len_upto_pre_line});
            len_upto_pre_line = i + 1;
            continue;
        }

        // keyword(sign)
        keyword: for(const keyword of sign_keywords) {
            if(i + keyword.length > code.length) continue;
            for(let j = 0; j < keyword.length; j++) {
                if(code.charAt(i + j) !== keyword.charAt(j)) continue keyword;
            }
            tokens.push({kind: "KEYWORD", keyword: keyword, line_num: line_num, col_num: i - len_upto_pre_line});
            i += keyword.length - 1;
            continue content;
        }

        // identifier
        if(is_alpha(code.charAt(i)) || code.charAt(i) === '_') {
            let ident = code.charAt(i);
            let j = 1;
            while(i + j < code.length && (is_alpha(code.charAt(i + j)) || is_num(code.charAt(i + j)) || code.charAt(i + j) === '_')) {
                ident += code.charAt(i + j++);
            }
            // keyword(alpha)
            for(const keyword of alpha_keywords) {
                if(ident === keyword) {
                    tokens.push({kind: "KEYWORD", keyword: keyword, line_num: line_num, col_num: i - len_upto_pre_line});
                    i += j - 1;
                    continue content;
                }
            }
            tokens.push({kind: "IDENT", ident: ident, line_num: line_num, col_num: i - len_upto_pre_line});
            i += j - 1;
            continue;
        }

        // string
        if(code.charAt(i) === '"') {
            let str = "";
            let j = 0;
            while(true) {
                if(code.length <= i + ++j) return {error: true, line_num: line_num, col_num: i + j - len_upto_pre_line, message: 'expected \'"\''};
                if(code.charAt(i + j) === '"') break;
                str += code.charAt(i + j);
            }
            tokens.push({kind: "STR", str: str, line_num: line_num, col_num: i - len_upto_pre_line});
            i += j;
            continue;
        }

        // number
        if(is_num(code.charAt(i))) {
            let num = code.charAt(i);
            let j = 1;
            while(i + j < code.length && is_num(code.charAt(i + j))) {
                num += code.charAt(i + j++);
            }
            tokens.push({kind: "NUM", num: parseInt(num), line_num: line_num, col_num: i - len_upto_pre_line});
            i += j - 1;
            continue;
        }

        return {error: true, line_num: line_num, col_num: i - len_upto_pre_line, message: 'unexpected char'};
    }

    return {error: false, tokens: tokens};
}

const Parse = (tokens: Token[], declared_vars: {name: string, type: Type}[]): StmtResult => {
    var i = 0;

    const is_end = () => (tokens.length <= i);

    const is_keyword = (keyword: string) => {
        if(is_end()) return false;
        const token = tokens[i];
        return token.kind === "KEYWORD" && token.keyword === keyword;
    }

    const consume_keyword = (keyword: string) => {
        if(is_keyword(keyword)) {
            i++;
            return true;
        }
        return false;
    }

    const is_ident = () => {
        if(is_end()) return undefined;
        const token = tokens[i];
        if(token.kind === "IDENT") return token.ident;
        return undefined;
    }

    const is_str = () => {
        if(is_end()) return undefined;
        const token = tokens[i];
        if(token.kind === "STR") return token.str;
        return undefined;
    }

    const is_num = () => {
        if(is_end()) return undefined;
        const token = tokens[i];
        if(token.kind === "NUM") return token.num;
        return undefined;
    }

    const declare_var = (var_name: string, type: Type) => {
        declared_vars.push({name: var_name, type: type});
        return declared_vars.length - 1;
    }

    const find_var = (var_name: string) => {
        for(const [index, declared_var] of declared_vars.entries()) {
            if(declared_var.name === var_name) return {index: index, type: declared_var.type};
        }
        return undefined;
    }

    const gen_error_result = (message: string, token_offset: number = 0): ErrorResult => {
        return {
            error: true,
            line_num: tokens[i + token_offset].line_num,
            col_num: tokens[i + token_offset].col_num,
            message: message
        };
    }

    const stmt = (): StmtResult => {
        while(consume_keyword("\n"));
        // if | while statement
        if(is_keyword("if") || is_keyword("while")) {
            const kind = is_keyword("if") ? "IF" : "WHILE";
            i++;
            if(!consume_keyword("(")) return gen_error_result("expected '('");
            const cond = expr();
            if(cond.error) return cond;
            if(!consume_keyword(")")) return gen_error_result("expected ')'");
            const if_stmt = stmt();
            if(if_stmt.error) return if_stmt;
            return {error: false, stmt: {kind: kind, cond: cond.expr, if: if_stmt.stmt}};
        }
        // block statement
        if(consume_keyword("{"))
            return block();
        // expr statement
        return expr_stmt();
    }

    const block = (): StmtResult => {
        const stmts: StmtInst[] = [];
        while(consume_keyword("\n"));
        while(!consume_keyword("}")) {
            const inst = stmt();
            if(inst.error) return inst;
            stmts.push(inst.stmt);
            while(consume_keyword("\n"));
        }
        return {error: false, stmt: {kind: "BLOCK", stmts: stmts}};
    }

    const expr_stmt = (): StmtResult => {
        const expr_stmt = expr();
        if(expr_stmt.error) return expr_stmt;
        if((is_keyword("\n") || is_keyword("}") || is_end())) return {error: false, stmt: {kind: "EXPR", expr: expr_stmt.expr}};
        return gen_error_result("expected '\\n'");
    }

    const expr = (): ExprResult => {
        return store();
    }

    const store = (): ExprResult => {
        const var_name = is_ident();
        if(var_name === undefined) return equal();
        const found_var = find_var(var_name)
        if(found_var === undefined) {
            i++;
            if(!consume_keyword("=")) return gen_error_result("expected '='");
            const value = store();
            if(value.error) return value;
            return {error: false, expr: {kind: "STORE", var_indexes: [{kind: "NUM", num: declare_var(var_name, value.type)}], value: value.expr}, type: value.type};
        }

        const left = equal();
        if(left.error) return left;
        let store_kind: StoreKind | undefined = undefined;
        if(consume_keyword("=")) store_kind = "STORE";
        else if(consume_keyword("+=")) store_kind = "ADDSTORE";
        else if(consume_keyword("-=")) store_kind = "SUBSTORE";

        if(store_kind === undefined) return left;
        if(left.expr.kind !== "LOAD") return gen_error_result("unexpected", -1);
        const right = store();
        if(right.error) return right;

        if(store_kind === "STORE") {
            if(!is_same_type(left.type, right.type)) return gen_error_result("not same type", -1);
            return {error: false, expr: {kind: "STORE", var_indexes: left.expr.var_indexes, value: right.expr}, type: right.type};
        }
        if(store_kind === "ADDSTORE" && left.type.kind === "array" && is_same_type(left.type.base_type, right.type))
            return {error: false, expr: {kind: "PUSHSTORE", var_indexes: left.expr.var_indexes, value: right.expr}, type: right.type};

        if(left.type.kind === "number" && right.type.kind === "number")
            return {error: false, expr: {kind: store_kind, var_indexes: left.expr.var_indexes, value: right.expr}, type: right.type};
        return gen_error_result("expected both type are number", -1);
    }

    const equal = (): ExprResult => {
        let left = add();
        if(left.error) return left;
        for(;;) {
            let equal_kind: BinaryKind | undefined = undefined;
            if(consume_keyword("==")) equal_kind = "EQU";
            else if(consume_keyword("!=")) equal_kind = "NEQ";
            else if(consume_keyword("<=")) equal_kind = "ELT";
            else if(consume_keyword(">=")) equal_kind = "EGT";
            else if(consume_keyword("<")) equal_kind = "LT";
            else if(consume_keyword(">")) equal_kind = "GT";

            if(equal_kind === undefined) break;
            const right = add();
            if(right.error) return right;
            if(left.type.kind !== "number" || right.type.kind !== "number") return gen_error_result("expected number and number", -1);
            left = {error: false, expr: {kind: equal_kind, left: left.expr, right: right.expr}, type: {kind: "number"}};
            continue;
        }
        return left;
    }

    const add = (): ExprResult => {
        let left = mul();
        if(left.error) return left;
        for(;;) {
            let add_kind: BinaryKind | undefined = undefined;
            if(consume_keyword("+")) add_kind = "ADD";
            else if(consume_keyword("-")) add_kind = "SUB"

            if(add_kind === undefined) break;
            const right = mul();
            if(right.error) return right;
            if(left.type.kind !== "number" || right.type.kind !== "number") return gen_error_result("expected number and number", -1);
            left = {error: false, expr: {kind: add_kind, left: left.expr, right: right.expr}, type: {kind: "number"}};
            continue;
        }
        return left;
    }

    const mul = (): ExprResult => {
        let left = primary();
        if(left.error) return left;
        for(;;) {
            let mul_kind: BinaryKind | undefined = undefined;
            if(consume_keyword("*")) mul_kind = "MUL";
            else if(consume_keyword("/")) mul_kind = "DIV";

            if(mul_kind === undefined) break;
            const right = primary();
            if(right.error) return right;
            if(left.type.kind !== "number" || right.type.kind !== "number") return gen_error_result("expected number and number", -1);
            left = {error: false, expr: {kind: mul_kind, left: left.expr, right: right.expr}, type: {kind: "number"}};
            continue;
        }
        return left;
    }
        
    const primary = (): ExprResult => {
        if(consume_keyword("__print__")) {
            const args_result = func_args(1);
            if(args_result.error) return args_result;
            const args = args_result.args;
            return {error: false, expr: {kind: "PRINT", value: args[0][0]}, type: {kind: "obj", pros: []}};
        }

        if(consume_keyword("__draw_circle__")) {
            const args_result = func_args(4);
            if(args_result.error) return args_result;
            const args = args_result.args;
            if(args[0][1].kind !== "number" || args[1][1].kind !== "number" || args[2][1].kind !== "number" || args[3][1].kind !== "string") return gen_error_result("mismatch args type", -1);
            return {error: false, expr: {kind: "DRAWCIRCLE", radius: args[0][0], x: args[1][0], y: args[2][0], color: args[3][0]}, type: {kind: "obj", pros: []}};
        }

        for(const pressed_kind of ["W", "A", "S", "D", "SPACE"] as PressedKind[]) {
            if(consume_keyword("__" + pressed_kind + "__")) {
                const args_result = func_args(0);
                if(args_result.error) return args_result;
                const args = args_result.args;
                return {error: false, expr: {kind: pressed_kind},type: {kind: "number"}}
            }
        }

        if(consume_keyword("(")) {
            const inst = store();
            if(inst.error) return inst;
            if(consume_keyword(")")) return inst;
            return gen_error_result("expected ')'");
        }

        if(consume_keyword("{")) {
            const pros: Map<string, [ExprInst, Type]> = new Map();
            while(!consume_keyword("}")) {
                const key_name = is_ident();
                if(key_name === undefined) return gen_error_result('expected identifier');
                if(pros.has(key_name)) return gen_error_result('already used key name');
                i++;

                if(!consume_keyword(":")) return gen_error_result("expected ':'");
                const value = store();
                if(value.error) return value;
                if(is_keyword(",")) i++;
                else if(!is_keyword("}")) return gen_error_result("expected '}'");
                pros.set(key_name, [value.expr, value.type]);
                continue;
            }
            const pro_values: ExprInst[] = [];
            const pro_types: [string, Type][] = [];
            pros.forEach((value, key_name) => {
                pro_values.push(value[0]);
                pro_types.push([key_name, value[1]]);
            });
            return {error: false, expr: {kind: "OBJ", pro_values: pro_values}, type: {kind: "obj", pros: pro_types}};
        }

        const var_name = is_ident();
        if(var_name !== undefined) {
            i++;
            const found_var = find_var(var_name);
            if(found_var === undefined) return gen_error_result('not defined var name');

            const var_indexes: ExprInst[] = [{kind: "NUM", num: found_var.index}];
            let var_type = found_var.type;
            load: for(;;) {
                if(consume_keyword(".")) {
                    if(var_type.kind !== 'obj') return gen_error_result('not object type', -1);
                    const pro_name = is_ident();
                    if(pro_name === undefined) return gen_error_result('expected key name');
                    i++;
                    for(const [index, pro] of var_type.pros.entries()) {
                        if(pro_name === pro[0]) {
                            var_indexes.push({kind: "NUM", num: index});
                            var_type = pro[1];
                            continue load;
                        }
                    }
                    return gen_error_result('not defined key name', -1);
                }
                if(consume_keyword("[")) {
                    if(var_type.kind !== 'array') return gen_error_result('not array type', -1);
                    const array_index = store();
                    if(array_index.error) return array_index;
                    if(array_index.type.kind !== "number") return gen_error_result('not number type', -1);
                    var_indexes.push(array_index.expr);
                    var_type = var_type.base_type;
                    if(!consume_keyword("]")) return gen_error_result("expected ']'");
                    continue;
                }
                break;
            }
            return {error: false, expr: {kind: "LOAD", var_indexes: var_indexes}, type: var_type};
        }

        const str = is_str();
        if(str !== undefined) {
            i++;
            return {error: false, expr: {kind: "STR", str: str}, type: {kind: "string"}};
        }

        const num = is_num();
        if(num !== undefined) {
            i++;
            return {error: false, expr: {kind: "NUM", num: num}, type: {kind: "number"}};
        }
        
        return gen_error_result("invalid token");
    }
    
    const func_args = (expected_length: number): {error: false, args: [ExprInst, Type][]} | ErrorResult => {
        if(consume_keyword("(")) {
            var is_first = true;
            const args: [ExprInst, Type][] = [];
            while(!consume_keyword(")")) {
                if(is_first) is_first = false;
                else if(!consume_keyword(",")) return gen_error_result("expected ','");

                const arg = store();
                if(arg.error) return arg;
                args.push([arg.expr, arg.type]);
            }
            if(args.length !== expected_length) return gen_error_result("expected args of " + expected_length + " length", -1);
            return {error: false, args: args};
        }
        return gen_error_result("expected '('");
    }

    const stmts: StmtInst[] = [];
    while(consume_keyword("\n"));
    while(!is_end()) {
        const inst = stmt();
        if(inst.error) return inst;
        stmts.push(inst.stmt);
        while(consume_keyword("\n"));
    }
    return {error: false, stmt: {kind: "BLOCK", stmts: stmts}};
}