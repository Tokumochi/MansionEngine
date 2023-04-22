import { genProcessInst, Inst } from './genInst'
import { Process } from './processManager'

const process1: Process = {
    params_str: "{arg: number}",
    rets_str: "{ret: number}",
    code: "ret = arg"
}
const inst1: Inst = {
    kind: "BLOCK", insts: [
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
            kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]
        }}
    ]
}

const process2: Process = {
    params_str: "{arg: number}",
    rets_str: "{ret: number}",
    code: "abc = 3 * (arg + 2 / 3)\n\n\n_print(abc) \n_draw_circle(abc + 300, 200, 400)\n ret = abc - 4"
}
const inst2: Inst = {
    kind: "BLOCK", insts: [
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 2}], value: {
            kind: "MUL",
            left: {kind: "NUM", num: 3},
            right: {kind: "ADD",
                    left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]},
                    right: {kind: "DIV",
                            left: {kind: "NUM", num: 2},
                            right: {kind: "NUM", num: 3}
                    }
            }
        }}, 
        {kind: "PRINT", value: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 2}]}},
        {kind: "DRAWCIRCLE", radius:
            {kind: "ADD",
                left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 2}]},
                right: {kind: "NUM", num: 300}
            },
            x: {kind: "NUM", num: 200},
            y: {kind: "NUM", num: 400}
        },
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
            kind: "SUB",
            left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 2}]},
            right: {kind: "NUM", num: 4}
        }},
    ]
}

const process3: Process = {
    params_str: "{arg: {a: number, b: {x: number[], y: string}}}",
    rets_str: "{ret: {c: number, d: {x: number[], y: string}}}",
    code: "ret.c = arg.a\nret.d.y = arg.b.y\nret.d.x[1 + 2]=arg.b.x[3]\nret.d = arg.b\nret=arg"
}
const inst3: Inst = {
    kind: "BLOCK", insts: [
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 0}], value: {
            kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 0}]
        }},
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}, {kind: "NUM", num: 1}], value: {
            kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 1}, {kind: "NUM", num: 1}]
        }},
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}, {kind: "NUM", num: 0}, {kind: "ADD", left: {kind: "NUM", num: 1}, right: {kind: "NUM", num: 2}}], value: {
            kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 1}, {kind: "NUM", num: 0}, {kind: "NUM", num: 3}]
        }},
        {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
            kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]
        }},
    ]
}

test('process1', () => {
    expect(genProcessInst(process1)).toEqual(inst1);
}); 
test('process2', () => {
    expect(genProcessInst(process2)).toEqual(inst2);
});