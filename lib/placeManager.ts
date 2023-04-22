import fs from 'fs'

import { gen_real_path } from './lib'
import { Type } from './typeManager'

export interface Placement {
    data_furs: Map<string, DataFurniture>,
    process_furs: Map<string, ProcessFurniture>,
    croom_furs: Map<string, CroomFurniture>,
    output_source: {id: string, index: number, type: Type},
}

interface Furniture {
    x: number,
    y: number,
    path: string,
}

export interface DataFurniture extends Furniture {
    data_type: Type,
}

export interface ProcessFurniture extends Furniture {
    sources: {
        id: string,
        index: number,
        type: Type,
    }[],
    emits: Type[],
}
  
export interface CroomFurniture extends Furniture {
    emit: Type,
}

const places = new Map<string, Placement>();

// placesに新たなplaceを追加する
const add_place = (room_path: string): Placement | undefined => {
    const file_and_real_path = gen_real_path(room_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'room') {
        console.log("room path is wrong!!");
        return undefined;
    }
/*
    var datas: [string, Data][] = [];
    var processes: [string, Process][] = [];
    var rooms: [string, Croom][] = [];

    const files = fs.readdirSync(real_path);

    var data_names = [];
    var process_names = [];
    var room_names = [];
    for(const file of files) {
        const file_split = file.split('.');
        if(file_split.length === 2 && file_split[1] === 'room') {
            room_names.push(file_split[0]);
        } else if(file_split.length === 3 && file_split[2] === 'json') {
            if(file_split[1] === 'data') data_names.push(file_split[0]);
            else if(file_split[1] === 'process') process_names.push(file_split[0]);
        }
    }
    // datas
    for(const data_name of data_names) {
        datas.push([data_name, JSON.parse(fs.readFileSync(real_path + "/" + data_name + ".data.json").toString())]);
    }
    // processes
    for(const process_name of process_names) {
        processes.push([process_name, JSON.parse(fs.readFileSync(real_path + "/" + process_name + ".process.json").toString())]);
    }
    // rooms
    for(const room_name of room_names) {
        rooms.push([room_name, {}]);
    }
*/
    const furs: {
        data_furs: [string, DataFurniture][],
        process_furs: [string, ProcessFurniture][],
        croom_furs: [string, CroomFurniture][],
        output_source: {id: string, index: number, type: Type}
    } = JSON.parse(fs.readFileSync(file_and_real_path.real_path + "/placement.json").toString());

    const place: Placement = {
        data_furs: new Map(furs.data_furs),
        process_furs: new Map(furs.process_furs),
        croom_furs: new Map(furs.croom_furs),
        output_source: furs.output_source,
    }
    places.set(room_path, place);
    return place;
}

// placesから目的のplaceを取得する
export const get_place = (room_path: string): Placement | undefined => {
    const room = places.get(room_path);
    if(room === undefined) return add_place(room_path);
    return room;
}

// placesにあるpathのplaceが既に含まれているか
export const has_joined_place = (room_path: string): boolean => {
    return places.has(room_path);
}

// furnitureの出力されるtypeを取得する
export const get_fur_emit_type = (place: Placement, id: string, index: number): Type | undefined => {
    const data_fur = place.data_furs.get(id);
    if(data_fur !== undefined) return data_fur.data_type;

    const process_fur = place.process_furs.get(id);
    if(process_fur !== undefined) {
        const emit = process_fur.emits[index];
        if(emit === undefined) {
            console.log("index is wrong");
            return undefined;
        }
        return emit;
    }

    const croom_fur = place.croom_furs.get(id);
    if(croom_fur !== undefined) return croom_fur.emit;

    return undefined;
}