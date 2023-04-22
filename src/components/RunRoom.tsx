import React, { useEffect, useState } from 'react';

import { Type, DataFurniture, ProcessFurniture } from './Main';
import { Inst, RoomRunInfo } from './EditPlacement';

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
		
			const run_stmt = (stmt_inst: Inst) => {
				switch(stmt_inst.kind) {
					case "BLOCK":
						for(const inst of stmt_inst.insts) {
							run_expr(inst);
						}
						return;
				}
				console.log("What's happening!?");
				return undefined;
			}
		
			const run_expr = (expr_inst: Inst): any | undefined => {
				switch(expr_inst.kind) {
					case "LOAD":
						let tmp_var_memories = var_memories;
						for(const index_inst of expr_inst.var_indexes) {
							const var_index = run_expr(index_inst);
							if(var_index === undefined) return undefined;
							tmp_var_memories = tmp_var_memories[var_index];
						}
						return tmp_var_memories;
					case "STORE": {
						let tmp_var_memories = var_memories;
						// 配列のインデックスで更新しなければいけないため
						const last_index_inst = expr_inst.var_indexes.pop();
						if(last_index_inst === undefined) return undefined;
						const last_var_index = run_expr(last_index_inst);
						// 変数メモリを一次元に
						for(const index_inst of expr_inst.var_indexes) {
							const var_index = run_expr(index_inst);
							if(var_index === undefined) return undefined;
							tmp_var_memories = tmp_var_memories[var_index];
						}
						const value = run_expr(expr_inst.value);
						if(value === undefined) return undefined;
						tmp_var_memories[last_var_index] = value;
						return value; 
					}
					case "ADD": {
						const left = run_expr(expr_inst.left);
						const right = run_expr(expr_inst.right);
						if(left === undefined || right === undefined || typeof left !== 'number' || typeof right !== 'number') return undefined;
						return left + right;
					}
					case "SUB": {
						const left = run_expr(expr_inst.left);
						const right = run_expr(expr_inst.right);
						if(left === undefined || right === undefined || typeof left !== 'number' || typeof right !== 'number') return undefined;
						return left - right;
					}
					case "MUL": {
						const left = run_expr(expr_inst.left);
						const right = run_expr(expr_inst.right);
						if(left === undefined || right === undefined || typeof left !== 'number' || typeof right !== 'number') return undefined;
						return left * right;
					}
					case "DIV": {
						const left = run_expr(expr_inst.left);
						const right = run_expr(expr_inst.right);
						if(left === undefined || right === undefined || typeof left !== 'number' || typeof right !== 'number') return undefined;
						return left / right;
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
				}
				console.log("What's happening!?");
				return undefined;
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
  		//requestAnimationFrame(tick);
		}
		tick();
	}, [])

	return (
		<canvas width="500" height="250" id="canvas" />
	)
}

export default RunRoom;