import { Type, type_str_to_type, type_to_simple_data_str } from './typeManager'

const type_str1 = "number";
const type_str2 = " {\n    a: string, \n    b : {\n        cde: number[],\n        fg: string[ ][] , \n    }[] \n}   \n \n "

test('type_str1', () => {
    expect(type_str_to_type(type_str1)).toEqual({kind: "number"});
}); 
test('type_str2', () => {
    expect(type_str_to_type(type_str2)).toEqual({
        kind: "obj", pros:[
            ["a", {kind: "string"}],
            ["b", {kind: "array", base_type: {kind: "obj", pros: [
                ["cde", {kind: "array", base_type: {kind: "number"}}],
                ["fg", {kind: "array", base_type: {kind: "array", base_type: {kind: "string"}}}],
            ]}}]
        ]
    });
});

const type1: Type = {kind: "number"};
const type2: Type = {kind: "obj", pros:[
    ["a", {kind: "string"}],
    ["b", {kind: "array", base_type: {kind: "obj", pros: [
        ["cde", {kind: "array", base_type: {kind: "number"}}],
        ["fg", {kind: "array", base_type: {kind: "array", base_type: {kind: "string"}}}],
    ]}}]
]};

test('simple_data_str1', () => {
    expect(type_to_simple_data_str(type1)).toEqual("0");
}); 
test('simple_data_str2', () => {
    expect(type_to_simple_data_str(type2)).toEqual("{a: \"\", b: [] of {cde: number[], fg: string[][]}}");
});