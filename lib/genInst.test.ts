import { genProcessInst, StmtInst } from './genInst'
import { Process } from './processManager'

const process1: Process = {
    params_str: "{arg: number}",
    rets_str: "{ret: number}",
    code: "ret = arg"
}
const inst1: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
                kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]
            }}
        },
    ]
}

const process2: Process = {
    params_str: "{arg: number}",
    rets_str: "{ret: number}",
    code: "abc = 3 * (arg + 2 / 3)\n\n\n__print__(abc) \n__draw_circle__(abc + 300, 200, 400)\n ret = abc - 4"
}
const inst2: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "EXPR", expr:
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
        },
        {kind: "EXPR", expr:
            {kind: "PRINT", value: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 2}]}},
        },
        {kind: "EXPR", expr:
            {kind: "DRAWCIRCLE", radius:
                {kind: "ADD",
                    left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 2}]},
                    right: {kind: "NUM", num: 300}
                },
                x: {kind: "NUM", num: 200},
                y: {kind: "NUM", num: 400}
            },
        },
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
                kind: "SUB",
                left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 2}]},
                right: {kind: "NUM", num: 4}
            }},
        }
    ]
}

const process3: Process = {
    params_str: "{arg: {a: number, b: {x: number[], y: string}}}",
    rets_str: "{ret: {c: number, d: {x: number[], y: string}}}",
    code: "ret.c = arg.a\nret.d.y = arg.b.y\nret.d.x[1 + 2]=arg.b.x[3]\nret.d = arg.b\n"
}
const inst3: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 0}], value: {
                kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 0}]
            }},
        },
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}, {kind: "NUM", num: 1}], value: {
                kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 1}, {kind: "NUM", num: 1}]
            }},
        },
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}, {kind: "NUM", num: 0}, {kind: "ADD", left: {kind: "NUM", num: 1}, right: {kind: "NUM", num: 2}}], value: {
                kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 1}, {kind: "NUM", num: 0}, {kind: "NUM", num: 3}]
            }},
        },
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}], value: {
                kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 1}]
            }},
        }
    ]
}

const process4: Process = {
    params_str: "{arg: number}",
    rets_str: "{ret: number}",
    code: "if(arg) {\narg = 0\nwhile(arg < 10) arg = arg + 1\nret = arg\n}"
}
const inst4: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "IF", cond: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]}, if: {
            kind: "BLOCK", stmts: [
                {kind: "EXPR", expr:
                    {kind: "STORE", var_indexes: [{kind: "NUM", num: 0}], value: {
                        kind: "NUM", num: 0
                    }},
                },
                {kind: "WHILE",
                    cond: {kind: "LT", 
                        left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]},
                        right: {kind: "NUM", num: 10},
                    },
                    if: {kind: "EXPR", expr:
                        {kind: "STORE", var_indexes: [{kind: "NUM", num: 0}], value: {
                            kind: "ADD",
                            left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]},
                            right: {kind: "NUM", num: 1},
                        }}
                    }
                },
                {kind: "EXPR", expr:
                    {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
                        kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}]
                    }},
                }
            ]
        }},
    ]
}

const process5: Process = {
    params_str: "{}",
    rets_str: "{}",
    code: "if(1 < 0) {\n    __print__(100)\n}\n__print__(0)"
}
const inst5: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "IF", 
            cond: {kind: "LT", 
                left: {kind: "NUM", num: 1},
                right: {kind: "NUM", num: 0},
            },
            if: {kind: "BLOCK", stmts: [
                {kind: "EXPR", expr:
                    {kind: "PRINT", value: {kind: "NUM", num: 100}}
                }
            ]}
        },
        {kind: "EXPR", expr:
            {kind: "PRINT", value: {kind: "NUM", num: 0}}
        }
    ]
}

const process6: Process = {
    params_str: "{}",
    rets_str: "{}",
    code: "i = 0"
}
const inst6: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 0}], value: {
                kind: "NUM", num: 0
            }}
        }
    ]
}

const process7: Process = {
    params_str: "{before: {\n    x: number,\n    y: number,\n    radius: number,\n  }\n}",
    rets_str: "{after: {\n    x: number,\n    y: number,\n    radius: number,\n  }\n}",
    code: "after = { x: 0, y: 0, radius: 0 }\nif(__W__()) after.y -= 1\nif(__S__()) after.y += 1\nif(__A__()) after.x = before.x - 1\nif(__D__()) after.x = before.x + 1"
}
const inst7: StmtInst = {
    kind: "BLOCK", stmts: [
        {kind: "EXPR", expr: {
            kind: "STORE", var_indexes: [{kind: "NUM", num: 1}], value: {
                kind: "OBJ", pro_values: [{kind: "NUM", num: 0}, {kind: "NUM", num: 0}, {kind: "NUM", num: 0}]
            }
        }},
        {kind: "IF", cond: {kind: "W"}, if: { kind: "EXPR", expr:
            {kind: "SUBSTORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}],
                value: {kind: "NUM", num: 1},
            }
        }},
        {kind: "IF", cond: {kind: "S"}, if: { kind: "EXPR", expr:
            {kind: "ADDSTORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 1}],
                value: {kind: "NUM", num: 1},
            }
        }},
        {kind: "IF", cond: {kind: "A"}, if: { kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 0}], value: {
                kind: "SUB",
                left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 0}]},
                right: {kind: "NUM", num: 1},
            }}
        }},
        {kind: "IF", cond: {kind: "D"}, if: { kind: "EXPR", expr:
            {kind: "STORE", var_indexes: [{kind: "NUM", num: 1}, {kind: "NUM", num: 0}], value: {
                kind: "ADD",
                left: {kind: "LOAD", var_indexes: [{kind: "NUM", num: 0}, {kind: "NUM", num: 0}]},
                right: {kind: "NUM", num: 1},
            }}
        }},
    ]
}


test('process1', () => {
    expect(genProcessInst(process1)).toEqual(inst1);
}); 
test('process2', () => {
    expect(genProcessInst(process2)).toEqual(inst2);
});
test('process3', () => {
    expect(genProcessInst(process3)).toEqual(inst3);
});
test('process4', () => {
    expect(genProcessInst(process4)).toEqual(inst4);
});
test('process5', () => {
    expect(genProcessInst(process5)).toEqual(inst5);
});
test('process6', () => {
    expect(genProcessInst(process6)).toEqual(inst6);
});
test('process7', () => {
    expect(genProcessInst(process7)).toEqual(inst7);
});