import express from 'express'
import fs from 'fs'
import { Socket } from 'socket.io'

import { gen_real_path } from './lib/lib'
import { get_type_str, is_same_type, set_type_str, type_str_to_type, type_to_simple_data_str } from './lib/typeManager'
import { get_data_str, has_joined_data_str, data_str_to_type_and_data, set_data_str } from './lib/dataManager'
import { get_process, Process, set_process } from './lib/processManager'
import { get_place, has_joined_place, get_fur_emit_type, DataFurniture, ProcessFurniture, CroomFurniture, get_fur_emit_type_for_debug } from './lib/placeManager'
import { get_dir, has_joined_dir, FileType } from './lib/dirManager'
import { StmtInst, genProcessInst } from './lib/genInst'

export interface RoomRunInfo {
    data_furs: [string, DataFurniture][],
    process_furs: [string, ProcessFurniture][],
    croom_furs: [string, CroomFurniture][],
  
    data_values: [string, any][],
    process_insts: [string, StmtInst][],
    croom_run_infos: [string, RoomRunInfo][],
  
    output_sources: {id: string, index: number}[],
}

type CompileErrorKind = "DataFur" | "ProcessFur" | "RoomPath" | "DataCode" | "ProcessCode"

type CompileError = {
    kind: CompileErrorKind,
    message: string,
}

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
      origin: "*",
    }
});

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*")
    res.header("Access-Control-Allow-Headers", "*");
    next();
})



const genRoomRunInfo = (room_path: string): {is_error: false, info: RoomRunInfo} | {is_error: true, error: CompileError} => {
    const place = get_place(room_path);
    if(place === undefined) {
        console.log("room path is wrong");
        return {is_error: true, error: {kind: "RoomPath", message: "room path is wrong"}};
    }

    const data_paths = new Set<string>();
    const process_paths = new Set<string>();
    const croom_paths = new Set<string>();
    
    for(const [fur_id, data_fur] of place.data_furs) {
        data_paths.add(data_fur.path);
    }
    for(const [fur_id, process_fur] of place.process_furs) {
        process_paths.add(process_fur.path);
    }
    for(const [fur_id, croom_fur] of place.croom_furs) {
        croom_paths.add(croom_fur.path);
    }

    const room_run_info: RoomRunInfo = {
        data_furs: Array.from(place.data_furs),
        process_furs: Array.from(place.process_furs),
        croom_furs: Array.from(place.croom_furs),

        data_values: [],
        process_insts: [],
        croom_run_infos: [],
        output_sources: place.output_sources,
    };

    for(const data_path of data_paths) {
        const data_str = get_data_str(data_path);
        if(data_str === undefined) {
            console.log("data path '" + data_path + "' is wrong");
            return {is_error: true, error: {kind: "DataFur", message: "data path '" + data_path + "' is wrong"}};
        }
        const type_and_data = data_str_to_type_and_data(data_str);
        if(type_and_data === undefined) return {is_error: true, error: {kind: "DataCode", message: "can't compile data " + data_path + "'s code"}};;
        room_run_info.data_values.push([data_path, type_and_data[1]]);
    }
    for(const process_path of process_paths) {
        const process = get_process(process_path);
        if(process === undefined) {
            console.log("process path '" + process_path + "' is wrong");
            return {is_error: true, error: {kind: "ProcessFur", message: "process path '" + process_path + "' is wrong"}};
        }
        const inst = genProcessInst(process);
        if(inst.is_error) {
            console.log(process_path + "'s code is wrong");
            return {is_error: true, error: {kind: "ProcessCode", message: process_path + "'s error\n" + inst.error_message}};
        }
        room_run_info.process_insts.push([process_path, inst.stmt]);
    }
    for(const croom_path of croom_paths) {
        const croom_run_info = genRoomRunInfo(croom_path);
        if(croom_run_info.is_error) return croom_run_info;
        room_run_info.croom_run_infos.push([croom_path, croom_run_info.info]);
    }

    return {is_error: false, info: room_run_info};
}



io.on('connection', (socket: Socket) => {
    socket.on("disconnect", () => {
      //console.log("disconnected");
    });


    // ディレクトリページ
    socket.on("join dir", (dir_path: string) => {
        const dir = get_dir(dir_path);
        if(dir === undefined) return;

        for(const joined_dir_path of socket.rooms) {
            if(has_joined_dir(joined_dir_path)) socket.leave(joined_dir_path);
        }
        socket.join(dir_path);

        io.to(socket.id).emit("update dir", {is_room: dir.is_room, files: Array.from(dir.files)});
    });
    socket.on("create new file", (dir_path: string, new_name: string | null, new_type: FileType) => {
        const dir = get_dir(dir_path);
        if(dir === undefined) return;

        if(new_name === '' || new_name === null) {
            console.log('invalid new name (empty name)');
            return;
        }
        for(const [file_name, file_type] of dir.files) {
            if(file_name === new_name) {
                console.log('This name already exists');
                return;
            }
        }
        const file_and_real_path = gen_real_path(dir_path);
        if(file_and_real_path === undefined || (file_and_real_path.file !== 'directory' && file_and_real_path.file !== 'room')) {
            console.log("dir path is wrong");
            return undefined;
        }
        const real_path = file_and_real_path.real_path;
        switch(new_type) {
            case "directory":
                fs.mkdirSync(real_path + '/' + new_name);
                break;
            case "room":
                fs.mkdirSync(real_path + '/' + new_name + '.room');
                fs.writeFileSync(real_path + '/' + new_name + '.room/placement.json', '{\n"data_furs": [],\n"process_furs": [],\n"croom_furs": [],\n"output_sources": [],\n"debugs": []\n}');
                break;
            case "type":
                fs.writeFileSync(real_path + '/' + new_name + '.type.json', '"number"');
                break;
            case "data":
                fs.writeFileSync(real_path + '/' + new_name + '.data.json', '"0"');
                break;
            case "process":
                fs.writeFileSync(real_path + '/' + new_name + '.process.json', '{\n"params_str": "",\n"rets_str": "",\n"code": ""\n}');
        }
        dir.files.set(new_name, new_type);
        io.in(dir_path).emit("create new file", new_name, new_type);
    });
    socket.on("delete file", (dir_path: string, target_name: string) => {
        const dir = get_dir(dir_path);
        if(dir === undefined) return;

        if(target_name === '') {
            console.log('invalid target name (empty name)');
            return;
        }
        const file_and_real_path = gen_real_path(dir_path);
        if(file_and_real_path === undefined || (file_and_real_path.file !== 'directory' && file_and_real_path.file !== 'room')) {
            console.log("dir path is wrong");
            return undefined;
        }
        const real_path = file_and_real_path.real_path;
        const target_type = dir.files.get(target_name);
        switch(target_type) {
            case undefined:
                console.log("invalid target name (not exist)");
                return;
            case "directory":
                if(!fs.existsSync(real_path + '/' + target_name)) {
                    console.log("What's happening!?")
                    return;
                }
                fs.rmdirSync(real_path + '/' + target_name);
                break;
            case "room":
                if(!fs.existsSync(real_path + '/' + target_name + '.room') || !fs.existsSync(real_path + '/' + target_name + '.room/placement.json') ) {
                    console.log("What's happening!?")
                    return;
                }
                fs.unlinkSync(real_path + '/' + target_name + '.room/placement.json');
                fs.rmdirSync(real_path + '/' + target_name + '.room');
                break;
            default:
                if(!fs.existsSync(real_path + '/' + target_name + '.' + target_type + '.json')) {
                    console.log("What's happening!?")
                    return;
                }
                fs.unlinkSync(real_path + '/' + target_name + '.' + target_type + '.json');
        }
        dir.files.delete(target_name);
        io.in(dir_path).emit("delete file", target_name)
    });


    // ルームページ
    socket.on("join placement", (room_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        for(const joined_room_path of socket.rooms) {
            if(has_joined_place(joined_room_path)) socket.leave(joined_room_path);
        }
        socket.join(room_path);

        io.to(socket.id).emit("update data furs", Array.from(place.data_furs));
        io.to(socket.id).emit("update process furs", Array.from(place.process_furs));
        io.to(socket.id).emit("update croom furs", Array.from(place.croom_furs));
        io.to(socket.id).emit("update output sources", place.output_sources);

        io.to(socket.id).emit("update debugs", Array.from(place.debugs).map(([debug_name, debug]) => [
            debug_name, {
                data_furs: Array.from(debug.data_furs),
                process_furs: Array.from(debug.process_furs),
                croom_furs: Array.from(debug.croom_furs),
                process_connects: Array.from(debug.process_connects),
            }
        ]));
    });
    socket.on("set fur pos", (room_path: string, target_id: string, x: number, y: number) => {
        const place = get_place(room_path);
        if(place === undefined) return;
        
        const target_data_fur = place.data_furs.get(target_id);
        if(target_data_fur !== undefined) {
            const new_data_fur = {...target_data_fur, x: x, y: y};
            place.data_furs.set(target_id, new_data_fur);
            io.in(room_path).emit("update data fur", target_id, new_data_fur);
            return;
        }

        const target_process_fur = place.process_furs.get(target_id);
        if(target_process_fur !== undefined) {
            const new_process_fur = {...target_process_fur, x: x, y: y};
            place.process_furs.set(target_id, new_process_fur);
            io.in(room_path).emit("update process fur", target_id, new_process_fur);
            return;
        }

        const target_croom_fur = place.croom_furs.get(target_id);
        if(target_croom_fur !== undefined) {
            const new_croom_fur = {...target_croom_fur, x: x, y: y};
            place.croom_furs.set(target_id, new_croom_fur);
            io.in(room_path).emit("update croom fur", target_id, new_croom_fur);
            return;
        }

        console.log("room path or fur id is wrong.")
    });
    socket.on("delete fur", (room_path: string, target_id: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;
        
        const target_data_fur = place.data_furs.get(target_id);
        if(target_data_fur !== undefined) {
            place.data_furs.delete(target_id);
            io.in(room_path).emit("update data fur", target_id, null);
            return;
        }

        const target_process_fur = place.process_furs.get(target_id);
        if(target_process_fur !== undefined) {
            Array.from(place.debugs.values()).forEach(debug => {
                debug.process_connects.forEach((source, connect_id) => {
                  if(target_id === source.id) debug.process_connects.delete(connect_id);
                });
            });
            place.process_furs.delete(target_id);
            io.in(room_path).emit("update process fur", target_id, null);
            return;
        }

        const target_croom_fur = place.croom_furs.get(target_id);
        if(target_croom_fur !== undefined) {
            place.croom_furs.delete(target_id);
            io.in(room_path).emit("update croom fur", target_id, null);
            return;
        }

        console.log("room path or fur id is wrong.")
    });
    socket.on("connect furs", (room_path: string, upper_id: string, upper_index: number, lower_id: string, lower_index: number) => {
        if(upper_id === lower_id) return;

        const place = get_place(room_path);
        if(place === undefined) return;

        const lower_type = get_fur_emit_type(place, lower_id, lower_index);
        if(lower_type === undefined) return;

        // 上側がroomのoutputの場合
        if(upper_id === "output") {
            place.output_sources[upper_index].id = lower_id;
            place.output_sources[upper_index].index = lower_index;
            place.output_sources[upper_index].type = lower_type;
            io.in(room_path).emit("update output sources", place.output_sources);
            return;
        }

        // 上側がprocess_furnitureの場合
        const upper_process_fur = place.process_furs.get(upper_id);
        if(upper_process_fur !== undefined) {
            if(is_same_type(upper_process_fur.sources[upper_index].type, lower_type)) {
                upper_process_fur.sources[upper_index].id = lower_id;
                upper_process_fur.sources[upper_index].index = lower_index;
                io.in(room_path).emit("update process fur", upper_id, upper_process_fur);
            }
        }
    });
    socket.on("gen data fur", (room_path: string, x: number, y: number, data_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const target_data_str = get_data_str(data_path);
        if(target_data_str === undefined) {
            console.log("data path is wrong.");
            return;
        }
        const target_type_and_data = data_str_to_type_and_data(target_data_str);
        if(target_type_and_data === undefined) return;

        const new_id = Math.random().toString(36).slice(-8);

        const new_data_fur = {
            x: x,
            y: y,
            path: data_path,
            data_type: target_type_and_data[0],
        };
        place.data_furs.set(new_id, new_data_fur);
        io.in(room_path).emit("update data fur", new_id, new_data_fur);
    });
    socket.on("gen process fur", (room_path: string, x: number, y: number, process_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const target_process = get_process(process_path);
        if(target_process === undefined) {
            console.log("process path is wrong.");
            return;
        }

        const new_id = Math.random().toString(36).slice(-8);
        const param_obj_type = type_str_to_type(target_process.params_str);
        if(param_obj_type === undefined) {
            console.log("can't compile params str");
            return;
        }
        if(param_obj_type.kind !== 'obj') {
            console.log("params str' kind is not obj");
            return;
        }
        const ret_obj_type = type_str_to_type(target_process.rets_str);
        if(ret_obj_type === undefined) {
            console.log("can't compile rets str");
            return;
        }
        if(ret_obj_type.kind !== 'obj') {
            console.log("rets str' kind is not obj");
            return;
        }

        const new_process_fur: ProcessFurniture = {
            x: x,
            y: y,
            path: process_path,
            sources: param_obj_type.pros.map((pro) => { return {id: "-1", index: -1, type: pro[1]} }),
            emits: ret_obj_type.pros.map((pro) => pro[1]),
        };
        place.process_furs.set(new_id, new_process_fur);
        io.in(room_path).emit("update process fur", new_id, new_process_fur);
    });
    socket.on("gen croom fur", (room_path: string, x: number, y: number, croom_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const target_croom_place = get_place(croom_path);
        if(target_croom_place === undefined) {
            console.log("croom path is wrong.");
            return;
        }

        const new_id = Math.random().toString(36).slice(-8);
        const new_croom_fur = {
            x: x,
            y: y,
            path: croom_path,
            emits: target_croom_place.output_sources.map(output_source => output_source.type),
        };
        place.croom_furs.set(new_id, new_croom_fur);
        io.in(room_path).emit("update croom fur", new_id, new_croom_fur);
    });
    socket.on("increment output sources", (room_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        place.output_sources.push({id: "-1", index: -1, type: {kind: "number"}});
        io.in(room_path).emit("update output sources", place.output_sources);
    });
    socket.on("decrement output sources", (room_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        place.output_sources.pop();
        io.in(room_path).emit("update output sources", place.output_sources);
    });
    socket.on("create new debug", (room_path: string, new_debug_name: string | null) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        if(new_debug_name === '' || new_debug_name === null) {
            console.log('invalid new name (empty name)');
            return;
        }

        place.debugs.set(new_debug_name, {
            data_furs: new Map(),
            process_furs: new Map(),
            croom_furs: new Map(),
            process_connects: new Map()
        });
        io.in(room_path).emit("update debug", new_debug_name);
    });
    socket.on("set debug fur pos", (room_path: string, debug_name: string, target_id: string, x: number, y: number) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const debug = place.debugs.get(debug_name);
        if(debug === undefined) return;
        
        const target_debug_data_fur = debug.data_furs.get(target_id);
        if(target_debug_data_fur !== undefined) {
            const new_debug_data_fur = {...target_debug_data_fur, x: x, y: y};
            debug.data_furs.set(target_id, new_debug_data_fur);
            io.in(room_path).emit("update debug data fur", debug_name, target_id, new_debug_data_fur);
            return;
        }

        const target_debug_process_fur = debug.process_furs.get(target_id);
        if(target_debug_process_fur !== undefined) {
            const new_debug_process_fur = {...target_debug_process_fur, x: x, y: y};
            debug.process_furs.set(target_id, new_debug_process_fur);
            io.in(room_path).emit("update debug process fur", debug_name, target_id, new_debug_process_fur);
            return;
        }

        const target_debug_croom_fur = debug.croom_furs.get(target_id);
        if(target_debug_croom_fur !== undefined) {
            const new_debug_croom_fur = {...target_debug_croom_fur, x: x, y: y};
            debug.croom_furs.set(target_id, new_debug_croom_fur);
            io.in(room_path).emit("update debug croom fur", debug_name, target_id, new_debug_croom_fur);
            return;
        }

        console.log("room path, debug name or fur id is wrong.")
    });
    socket.on("delete debug fur", (room_path: string, debug_name: string, target_id: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const debug = place.debugs.get(debug_name);
        if(debug === undefined) return;
        
        const target_debug_data_fur = debug.data_furs.get(target_id);
        if(target_debug_data_fur !== undefined) {
            debug.data_furs.delete(target_id);
            io.in(room_path).emit("update debug data fur", debug_name, target_id, null);
            return;
        }

        const target_debug_process_fur = debug.process_furs.get(target_id);
        if(target_debug_process_fur !== undefined) {
            debug.process_connects.forEach((source, connect_id) => {
              if(source.id === target_id) debug.process_connects.delete(connect_id);
            });
            debug.process_furs.delete(target_id);
            io.in(room_path).emit("update debug process fur", debug_name, target_id, null);
            return;
        }

        const target_debug_croom_fur = debug.croom_furs.get(target_id);
        if(target_debug_croom_fur !== undefined) {
            debug.croom_furs.delete(target_id);
            io.in(room_path).emit("update debug croom fur", debug_name, target_id, null);
            return;
        }

        console.log("room path, debug name or fur id is wrong.")
    });
    socket.on("connect furs for debug", (room_path: string, debug_name: string, upper_id: string, upper_index: number, lower_id: string, lower_index: number) => {
        if(upper_id === lower_id) return;

        const place = get_place(room_path);
        if(place === undefined) return;

        const debug = place.debugs.get(debug_name);
        if(debug === undefined) return;

        const lower_type = get_fur_emit_type_for_debug(place, debug, lower_id, lower_index);
        if(lower_type === undefined) return;

        // 上側がデバッグ用のprocess_furnitureの場合
        const upper_debug_process_fur = debug.process_furs.get(upper_id);
        if(upper_debug_process_fur !== undefined) {
            if(is_same_type(upper_debug_process_fur.sources[upper_index].type, lower_type)) {
                upper_debug_process_fur.sources[upper_index].id = lower_id;
                upper_debug_process_fur.sources[upper_index].index = lower_index;
                io.in(room_path).emit("update debug process fur", debug_name, upper_id, upper_debug_process_fur);
            }
        }
        
        // 上側がメインのprocess_furnitureの場合
        const upper_main_process_fur = place.process_furs.get(upper_id);
        if(upper_main_process_fur !== undefined) {
            if(is_same_type(upper_main_process_fur.sources[upper_index].type, lower_type)) {
                debug.process_connects.set(upper_id + '-' + upper_index, {id: lower_id, index: lower_index});
                io.in(room_path).emit("update debug process connect", debug_name, upper_id, upper_index, lower_id, lower_index);
            }
        }
    });
    socket.on("gen debug data fur", (room_path: string, debug_name: string, x: number, y: number, data_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const debug = place.debugs.get(debug_name);
        if(debug === undefined) return;

        const target_data_str = get_data_str(data_path);
        if(target_data_str === undefined) {
            console.log("data path is wrong.");
            return;
        }
        const target_type_and_data = data_str_to_type_and_data(target_data_str);
        if(target_type_and_data === undefined) return;

        const new_id = Math.random().toString(36).slice(-8);

        const new_debug_data_fur = {
            x: x,
            y: y,
            path: data_path,
            data_type: target_type_and_data[0],
        };
        debug.data_furs.set(new_id, new_debug_data_fur);
        io.in(room_path).emit("update debug data fur", debug_name, new_id, new_debug_data_fur);
    });
    socket.on("gen debug process fur", (room_path: string, debug_name: string, x: number, y: number, process_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const debug = place.debugs.get(debug_name);
        if(debug === undefined) return;

        const target_process = get_process(process_path);
        if(target_process === undefined) {
            console.log("process path is wrong.");
            return;
        }

        const new_id = Math.random().toString(36).slice(-8);
        const param_obj_type = type_str_to_type(target_process.params_str);
        if(param_obj_type === undefined) {
            console.log("can't compile params str");
            return;
        }
        if(param_obj_type.kind !== 'obj') {
            console.log("params str' kind is not obj");
            return;
        }
        const ret_obj_type = type_str_to_type(target_process.rets_str);
        if(ret_obj_type === undefined) {
            console.log("can't compile rets str");
            return;
        }
        if(ret_obj_type.kind !== 'obj') {
            console.log("rets str' kind is not obj");
            return;
        }

        const new_debug_process_fur: ProcessFurniture = {
            x: x,
            y: y,
            path: process_path,
            sources: param_obj_type.pros.map((pro) => { return {id: "-1", index: -1, type: pro[1]} }),
            emits: ret_obj_type.pros.map((pro) => pro[1]),
        };
        debug.process_furs.set(new_id, new_debug_process_fur);
        io.in(room_path).emit("update debug process fur", debug_name, new_id, new_debug_process_fur);
    });
    socket.on("save placement", (room_path: string) => {
        const place = get_place(room_path);
        if(place === undefined) return;

        const file_and_real_path = gen_real_path(room_path);
        if(file_and_real_path === undefined || file_and_real_path.file !== 'room') {
            console.log('room path is wrong');
            return;
        }
        fs.writeFileSync(file_and_real_path.real_path + '/placement.json', JSON.stringify({
            data_furs: Array.from(place.data_furs),
            process_furs: Array.from(place.process_furs),
            croom_furs: Array.from(place.croom_furs),
            output_sources: place.output_sources,
            debugs: Array.from(place.debugs).map(debug => [
                debug[0], {
                    data_furs: Array.from(debug[1].data_furs),
                    process_furs: Array.from(debug[1].process_furs),
                    croom_furs: Array.from(debug[1].croom_furs),
                    process_connects: Array.from(debug[1].process_connects),
                }
            ])
        }, null, 2));
    });


    // ランルームページ
    socket.on("compile", (room_path: string) => {
        const compile_result = genRoomRunInfo(room_path);
        if(compile_result.is_error) {
            io.to(socket.id).emit("compile error", compile_result.error.kind, compile_result.error.message);
        } else {
            io.to(socket.id).emit("run", compile_result.info);
        }
    });


    // タイプページ
    socket.on("join type", (type_path: string) => {
        const type_str = get_type_str(type_path);
        if(type_str === undefined) return;

        for(const socket_room of socket.rooms) {
            if(socket_room !== socket.id) socket.leave(socket_room);
        }
        socket.join(type_path);

        io.to(socket.id).emit("update type str", type_str);
    });
    socket.on("save type str", (type_path: string, new_type_str: string) => {
        if(set_type_str(type_path, new_type_str)) {
            io.in(type_path).emit("update type str", new_type_str);
        } else {
            console.log("can't save type str");
        }
    });


    // データページ
    socket.on("join data", (data_path: string) => {
        const data_str = get_data_str(data_path);
        if(data_str === undefined) return;

        for(const socket_room of socket.rooms) {
            if(socket_room !== socket.id) socket.leave(socket_room);
        }
        socket.join(data_path);

        io.to(socket.id).emit("update data str", data_str);
    });
    socket.on("import type to data", (type_path: string) => {
        const type_str = get_type_str(type_path);
        if(type_str === undefined) return;

        const type = type_str_to_type(type_str);
        if(type === undefined) return;

        io.to(socket.id).emit("update data str", type_to_simple_data_str(type));
    });
    socket.on("save data str", (data_path: string, new_data_str: string) => {
        if(set_data_str(data_path, new_data_str)) {
            io.in(data_path).emit("update data str", new_data_str);
        } else {
            console.log("can't save data str");
        }
    });


    // プロセスページ
    socket.on("join process", (process_path: string) => {
        const process = get_process(process_path);
        if(process === undefined) return;

        for(const socket_room of socket.rooms) {
            if(socket_room !== socket.id) socket.leave(socket_room);
        }
        socket.join(process_path);

        io.to(socket.id).emit("update params str", process.params_str);
        io.to(socket.id).emit("update rets str", process.rets_str);
        io.to(socket.id).emit("update code", process.code);
    });
    socket.on("save process", (process_path: string, new_process: Process) => {
        if(set_process(process_path, new_process)) {
            io.in(process_path).emit("update params str", new_process.params_str);
            io.in(process_path).emit("update rets str", new_process.rets_str);
            io.in(process_path).emit("update code", new_process.code);
        } else {
            console.log("can't save process");
        }
    })
});

http.listen(8080);