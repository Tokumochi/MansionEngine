import { data_str_to_type_and_data } from './dataManager'

const data_str1 = "100";
const data_str2 = " {\n    a: \"str\", \n    b : [{\n        cde: [0, 10, 100],\n        fg: [[\"a\",  \"b\" ], [\"c\"],[  ] of string ] , \n    }, \n    {\n        cde: [] of number ,\n        fg: [] of string[] , \n    } ] \n}   \n \n ";

test('data_str1', () => {
    expect(data_str_to_type_and_data(data_str1)).toEqual([{kind: "number"}, 100]);
}); 
test('data_str2', () => {
    expect(data_str_to_type_and_data(data_str2)).toEqual([
        {kind: "obj", pros:[
            ["a", {kind: "string"}],
            ["b", {kind: "array", base_type: {kind: "obj", pros: [
                ["cde", {kind: "array", base_type: {kind: "number"}}],
                ["fg", {kind: "array", base_type: {kind: "array", base_type: {kind: "string"}}}],
            ]}}]
        ]},
        ["str", [[[0, 10, 100], [["a", "b"], ["c"], []]], [[], []]]]
    ]);
});