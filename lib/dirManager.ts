import fs from 'fs'

import { gen_real_path } from './lib'


export type FileType = "type" | "data" | "process" | "room" | "directory"

const dirs = new Map<string, {is_room: boolean, files: Map<string, FileType>}>();

// dirsに新たなdirを追加する
const add_dir = (dir_path: string): {is_room: boolean, files: Map<string, FileType>} | undefined => {
    const file_and_real_path = gen_real_path(dir_path);
    if(file_and_real_path === undefined || (file_and_real_path.file !== 'directory' && file_and_real_path.file !== 'room')) {
        console.log("dir path is wrong");
        return undefined;
    }

    const real_path = file_and_real_path.real_path;
    const file_names = fs.readdirSync(real_path);
    const files = new Map<string, FileType>();
    for(const file_name of file_names) {
        const splited_name = file_name.split('.');
        if(fs.statSync(real_path + '/' + file_name).isDirectory()) {
            if(splited_name.length === 1) {
                files.set(file_name, "directory");
            } else if(splited_name.length === 2 && splited_name[1] === 'room') {
                files.set(splited_name[0], "room");
            }
        } else {
            if(splited_name.length === 3 && splited_name[2] === 'json') {
                if(splited_name[1] === 'type') {
                    files.set(splited_name[0], "type");
                } else if(splited_name[1] === 'data') {
                    files.set(splited_name[0], "data");
                } else if(splited_name[1] === 'process') {
                    files.set(splited_name[0], "process");
                }
            }
        }
    }
    dirs.set(dir_path, {is_room: file_and_real_path.file === 'room', files: files});
    return {is_room: file_and_real_path.file === 'room', files: files};
}

// dirsから目的のdirを取得する
export const get_dir = (dir_path: string): {is_room: boolean, files: Map<string, FileType>} | undefined => {
    const dir = dirs.get(dir_path);
    if(dir === undefined) return add_dir(dir_path);
    return dir;
}

// dirsにあるpathのdirが既に含まれているか
export const has_joined_dir = (dir_path: string): boolean => {
    return dirs.has(dir_path);
}