import React, { useEffect, useState } from 'react';

import { Type, DataFurniture, ProcessFurniture, CroomFurniture } from './Main';

type StoreKind = "STORE" | "ADDSTORE" | "PUSHSTORE"
type BinaryKind = "EQU" | "NEQ" | "ELT" | "EGT" | "LT" | "GT" | "ADD" | "SUB" | "MUL" | "DIV"
type PressedKind = "W" | "A" | "S" | "D"

type ExprInst = {kind: "LOAD", var_indexes: ExprInst[]} |
            {kind: StoreKind, var_indexes: ExprInst[], value: ExprInst} |
            {kind: BinaryKind, left: ExprInst, right: ExprInst} |
            {kind: "NUM", num: number} |
            {kind: "PRINT", value: ExprInst} |
            {kind: "DRAWCIRCLE", radius: ExprInst, x: ExprInst, y: ExprInst} |
            {kind: PressedKind}

export type StmtInst = {kind: "EXPR", expr: ExprInst} |
            {kind: "BLOCK", stmts: StmtInst[]} |
            {kind: "IF" | "WHILE", cond: ExprInst, if: StmtInst}

export interface RoomRunInfo {
  data_furs: [string, DataFurniture][],
  process_furs: [string, ProcessFurniture][],
  croom_furs: [string, CroomFurniture][],

  data_values: [string, any][],
  process_insts: [string, StmtInst][],
  croom_run_infos: [string, RoomRunInfo][],

  output_source: {id: string, index: number},
}

let is_W_pressed = 0;
let is_A_pressed = 0;
let is_S_pressed = 0;
let is_D_pressed = 0;

document.onkeydown = (e) => {
	if(e.code === "KeyW") is_W_pressed = 1;
	if(e.code === "KeyA") is_A_pressed = 1;
	if(e.code === "KeyS") is_S_pressed = 1;
	if(e.code === "KeyD") is_D_pressed = 1;
};
document.onkeyup = (e) => {
	if(e.code === "KeyW") is_W_pressed = 0;
	if(e.code === "KeyA") is_A_pressed = 0;
	if(e.code === "KeyS") is_S_pressed = 0;
	if(e.code === "KeyD") is_D_pressed = 0;
};

function RunRoom(props: {top_room_run_info: RoomRunInfo}) {
	console.log(props.top_room_run_info);

	useEffect(() => {
		const canvas = document.getElementById('canvas') as HTMLCanvasElement;
		const ctx = canvas.getContext("2d");

		if(ctx === null) return;

		setTimeout(() => {
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, 500, 250);
			ctx.fill();
		})

		const draw_circle = (x: number, y: number, radius: number) => {
			setTimeout(() => {
				ctx.fillStyle = "lightskyblue";
				ctx.arc(x, y, radius, 0, Math.PI * 2, true);
				ctx.fill();
			})
		}

		const tick = () => {
			var var_memories: any[] = [];
		
			const run_stmt = (stmt_inst: StmtInst) => {
				switch(stmt_inst.kind) {
					case "EXPR":
						run_expr(stmt_inst.expr);
						return;
					case "BLOCK":
						for(const stmt of stmt_inst.stmts)
							run_stmt(stmt);
						return;
					case "IF":
						if(run_expr(stmt_inst.cond))
							run_stmt(stmt_inst.if);
						return;
					case "WHILE":
						while(run_expr(stmt_inst.cond))
							run_stmt(stmt_inst.if);
						return;
				}
			}
		
			const run_expr = (expr_inst: ExprInst): any | undefined => {
				switch(expr_inst.kind) {
					case "LOAD":
						let tmp_var_memories = var_memories;
						for(const index_inst of expr_inst.var_indexes) {
							const var_index = run_expr(index_inst);
							if(var_index === undefined) return undefined;
							tmp_var_memories = tmp_var_memories[var_index];
						}
						return tmp_var_memories;
					case "STORE":
					case "ADDSTORE":
					case "PUSHSTORE": {
						let tmp_var_memories = var_memories;
						// 配列のインデックスで更新しなければいけないため
						const last_index_inst = expr_inst.var_indexes[expr_inst.var_indexes.length - 1];
						// 変数メモリを一次元に
						for(let i = 0; i < expr_inst.var_indexes.length - 1; i++) {
							const index_inst = expr_inst.var_indexes[i];
							const var_index = run_expr(index_inst);
							if(var_index === undefined) return undefined;
							tmp_var_memories = tmp_var_memories[var_index];
						}
						const last_var_index = run_expr(last_index_inst);
						const value = run_expr(expr_inst.value);
						if(value === undefined) return undefined;

						if(expr_inst.kind === "STORE") tmp_var_memories[last_var_index] = value;
						else if(expr_inst.kind === "ADDSTORE") tmp_var_memories[last_var_index] += value;
						else tmp_var_memories[last_var_index].push(value);

						return value; 
					}
					case "NUM":
						return expr_inst.num;
					case "PRINT": {
						const value = run_expr(expr_inst.value);
						if(value === undefined) return undefined;
						console.log(value);
						return;
					}
					case "DRAWCIRCLE":
						const radius = run_expr(expr_inst.radius);
						const x = run_expr(expr_inst.x);
						const y = run_expr(expr_inst.y);
						if(radius === undefined || x === undefined || y === undefined) return undefined;
						if(typeof x !== 'number' || typeof y !== 'number' || typeof radius !== 'number') return undefined;
						draw_circle(x, y, radius);
						return;
					case "W": return is_W_pressed;
					case "A": return is_A_pressed;
					case "S": return is_S_pressed;
					case "D": return is_D_pressed;
				}

				const left = run_expr(expr_inst.left);
				const right = run_expr(expr_inst.right);
				if(left === undefined || right === undefined || typeof left !== 'number' || typeof right !== 'number') return undefined;

				switch(expr_inst.kind) {
					case "EQU": return left === right ? 1 : 0;
					case "NEQ": return left !== right ? 1 : 0;
					case "ELT": return left <= right ? 1 : 0;
					case "EGT": return left >= right ? 1 : 0;
					case "LT": return left < right ? 1 : 0;
					case "GT": return left > right ? 1 : 0;
					case "ADD": return left + right;
					case "SUB": return left - right;
					case "MUL": return left * right;
					case "DIV": return left / right;
				}
			}

			const run_room = (room_run_info: RoomRunInfo): any | undefined => {

				const furs_rets = new Map<string, any[]>();

				// crooms
				const croom_outputs = new Map<string, any>();
				for(const [croom_path, croom_run_info] of room_run_info.croom_run_infos) {
					const croom_output = run_room(croom_run_info);
					if(croom_output === undefined) return undefined;
					croom_outputs.set(croom_path, croom_output);
					console.log(croom_path);
				}
				for(const [id, croom_fur] of room_run_info.croom_furs) {
					const output = croom_outputs.get(croom_fur.path);
					if(output === undefined) {
						console.log("croom fur " + croom_fur.path + " is wrong");
						return undefined;
					}
					furs_rets.set(id, [output]);
				}

				// datas
				const data_values = new Map(room_run_info.data_values);

				for(const [id, data_fur] of room_run_info.data_furs) {
					const value = data_values.get(data_fur.path);
					if(value === undefined) {
						console.log("data fur " + data_fur.path + " is wrong");
						return undefined;
					}
					furs_rets.set(id, [value]);
				};

				// processes
				room_run_info.process_furs.sort(([a_id, a], [b_id, b]) => {
					if(a.y > b.y) return -1;
					else if(a.y < b.y) return 1;
					return 0;
				});
				const process_insts = new Map(room_run_info.process_insts);

				for(const [id, process_fur] of room_run_info.process_furs) {
					for(const [index, source] of process_fur.sources.entries()) {
						const input_values = furs_rets.get(source.id);
						if(input_values === undefined) return undefined;
						const input_value = input_values[source.index];
						if(input_value === undefined) return undefined;
						var_memories[index] = input_value;
					}
	
					const inst = process_insts.get(process_fur.path);
					if(inst === undefined) {
						console.log("process fur " + process_fur.path + "'s process name is wrong");
						return;
					}
					run_stmt(inst);
					const rets = [];
					for(let i = 0; i < process_fur.emits.length; i++) {
						rets.push(var_memories[process_fur.sources.length + i]);
					}
					furs_rets.set(id, rets);
				}

				// output
				const outputs = furs_rets.get(room_run_info.output_source.id);
				if(outputs === undefined) return undefined;
				const output = outputs[room_run_info.output_source.index];
				if(output === undefined) return undefined;
				return output;
			}

			run_room(props.top_room_run_info);
			requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}, [])

	return (
		<canvas width="500" height="250" id="canvas" />
	)
}

export default RunRoom;