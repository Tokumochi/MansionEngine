import fs from 'fs'

import { gen_real_path } from './lib'
import { Type } from './typeManager'

export interface DebugPlacement {
    data_furs: Map<string, DataFurniture>,
    process_furs: Map<string, ProcessFurniture>,
    croom_furs: Map<string, CroomFurniture>,
    process_connects: Map<string, {id: string, index: number}> // キーは[id]+'-'+[index]
}

export interface Placement {
    data_furs: Map<string, DataFurniture>,
    process_furs: Map<string, ProcessFurniture>,
    croom_furs: Map<string, CroomFurniture>,
    output_sources: {id: string, index: number, type: Type}[],

    debugs: Map<string, DebugPlacement>
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
    emits: Type[],
}

const places = new Map<string, Placement>();

// placesに新たなplaceを追加する
const add_place = (room_path: string): Placement | undefined => {
    const file_and_real_path = gen_real_path(room_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'room') {
        console.log("room path is wrong!!");
        return undefined;
    }

    const furs: {
        data_furs: [string, DataFurniture][],
        process_furs: [string, ProcessFurniture][],
        croom_furs: [string, CroomFurniture][],
        output_sources: {id: string, index: number, type: Type}[],
        debugs: [string, {
            data_furs: [string, DataFurniture][],
            process_furs: [string, ProcessFurniture][],
            croom_furs: [string, CroomFurniture][],
            process_connects: [string, {id: string, index: number}][],
        }][]
    } = JSON.parse(fs.readFileSync(file_and_real_path.real_path + "/placement.json").toString());

    const place: Placement = {
        data_furs: new Map(furs.data_furs),
        process_furs: new Map(furs.process_furs),
        croom_furs: new Map(furs.croom_furs),
        output_sources: furs.output_sources,

        debugs: new Map(furs.debugs.map(debug => [debug[0], {
            data_furs: new Map(debug[1].data_furs),
            process_furs: new Map(debug[1].process_furs),
            croom_furs: new Map(debug[1].croom_furs),
            process_connects: new Map(debug[1].process_connects),
        }]))
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
    if(croom_fur !== undefined) {
        const emit = croom_fur.emits[index];
        if(emit === undefined) {
            console.log("index is wrong");
            return undefined;
        }
        return emit;
    }

    return undefined;
}

// デバッグ用のfurnitureの出力されるtypeを取得する
export const get_fur_emit_type_for_debug = (place: Placement, debug: DebugPlacement, id: string, index: number): Type | undefined => {
    const type = get_fur_emit_type(place, id, index);
    if(type !== undefined) return type;

    const data_fur = debug.data_furs.get(id);
    if(data_fur !== undefined) return data_fur.data_type;

    const process_fur = debug.process_furs.get(id);
    if(process_fur !== undefined) {
        const emit = process_fur.emits[index];
        if(emit === undefined) {
            console.log("index is wrong");
            return undefined;
        }
        return emit;
    }

    const croom_fur = debug.croom_furs.get(id);
    if(croom_fur !== undefined) {
        const emit = croom_fur.emits[index];
        if(emit === undefined) {
            console.log("index is wrong");
            return undefined;
        }
        return emit;
    }

    return undefined;
}