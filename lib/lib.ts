import fs from 'fs'
import { FileType } from './dirManager';

/*
// 簡易なpathからOSの現実なpathに変換
export const gen_real_path = (routes: string[]): {is_room: boolean | undefined, real_path: string | undefined} => {
    let real_path = "./game_project"
    let is_room = false;
    for(const route of routes) {
        if(fs.existsSync(real_path + '/' + route)) {
            real_path += '/' + route;
            is_room = false;
        } else if(fs.existsSync(real_path + '/' + route + '.room')) {
            real_path += '/' + route + '.room';
            is_room = true;
        } else {
            return {is_room: undefined, real_path: undefined};
        }
    }
    return {is_room: is_room, real_path: real_path};
}
*/
// 簡易なpathからOSの現実なpathに変換
export const gen_real_path = (path: string): {file: FileType, real_path: string} | undefined => {
    let real_path = "./game_project"
    const routes = path.split('-');
    const goal = routes.pop();
    if(goal === undefined) return undefined;

    for(const route of routes) {
        if(fs.existsSync(real_path + '/' + route)) {
            real_path += '/' + route;
        } else if(fs.existsSync(real_path + '/' + route + '.room')) {
            real_path += '/' + route + '.room';
        } else {
            return undefined;
        }
    }

    if(fs.existsSync(real_path + '/' + goal))
        return {file: 'directory', real_path: real_path + '/' + goal};
    else if(fs.existsSync(real_path + '/' + goal + '.room'))
        return {file: 'room', real_path: real_path + '/' + goal + '.room'};
    else if(fs.existsSync(real_path + '/' + goal + '.type.json'))
        return {file: 'type', real_path: real_path + '/' + goal + '.type.json'};
    else if(fs.existsSync(real_path + '/' + goal + '.data.json'))
        return {file: 'data', real_path: real_path + '/' + goal + '.data.json'};
    else if(fs.existsSync(real_path + '/' + goal + '.process.json'))
        return {file: 'process', real_path: real_path + '/' + goal + '.process.json'};
    
    return undefined;
}

/*
const is_data_correct = (data: any) => {
    if(typeof data.data_name !== 'string') return false;
    // string type, number type
    if(typeof data.value === 'string' || typeof data.value === 'number') return true;
    if(typeof data.value === 'object' && Array.isArray(data.value)) {
        // string[] type, number[] type
        var counter = 0;
        for(const element of data.value) {
            if(typeof element === 'string') counter++;
            else if(typeof element === 'number') counter--;
        }
        if(counter === data.value.length || counter === -data.value.length) return true;
        // Data[] type
        for(const element of data.value) {
            if(!is_data_correct(element)) return false;
        }
        return true;
    }
    return false;
}

const is_room_correct = (room: any): room is Room => {
    if(!room) return false;
    // datas
    if(typeof room.datas !== 'object' || !Array.isArray(room.datas)) return false;
    for(const data of room.datas) {
        if(!is_data_correct(data)) return false;
    }
    // processes
    if(typeof room.processes !== 'object' || !Array.isArray(room.processes)) return false;
    for(const process of room.processes) {
        if(typeof process.process_name !== 'string' || typeof process.ret !== 'string' || typeof process.code !== 'string') return false;
        if(typeof process.args !== 'object' || !Array.isArray(process.args)) return false;
        for(const arg of process.args) {
            if(typeof arg !== 'string') return false;
        }
    }
    // furs
    if(typeof room.furs !== 'object') return false;
    // data_furs
    if(typeof room.furs.data_furs !== 'object' || !Array.isArray(room.furs.data_furs)) return false;
    for(const data_fur of room.furs.data_furs) {
        if(typeof data_fur.id !== 'string' || typeof data_fur.x !== 'number' || typeof data_fur.y !== 'number' || typeof data_fur.data_name !== 'string') return false;
    }
    // process_furs
    if(typeof room.furs.process_furs !== 'object' || !Array.isArray(room.furs.process_furs)) return false;
    for(const process_fur of room.furs.process_furs) {
        if(typeof process_fur.id !== 'string' || typeof process_fur.x !== 'number' || typeof process_fur.y !== 'number' || typeof process_fur.process_name !== 'string') return false;
        if(typeof process_fur.sources !== 'object' || !Array.isArray(process_fur.sources)) return false;
        for(const source of process_fur.sources) {
            if(typeof source !== 'string') return false;
        }
    }
    return true;
}
*/