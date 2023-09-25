import fs from 'fs'
import { Type, type_str_to_type } from './typeManager';

import { gen_real_path } from './lib'

export interface Process {
    params_str: string,
    rets_str: string,
    code: string,
}

const processes = new Map<string, Process>();

// processesに新たなprocessを追加する
const add_process = (process_path: string): Process | undefined => {
    const file_and_real_path = gen_real_path(process_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'process') {
        console.log("process path is wrong");
        return undefined;
    }

    const process: Process = JSON.parse(fs.readFileSync(file_and_real_path.real_path).toString());
    processes.set(process_path, process);
    return process;
}

// processesから目的のprocessを取得する
export const get_process = (process_path: string): Process | undefined => {
    const process = processes.get(process_path);
    if(process === undefined) return add_process(process_path);
    return process;
}

// processesに新たにprocessを登録してファイルも上書き保存
export const set_process = (process_path: string, new_process: Process) => {
    const file_and_real_path = gen_real_path(process_path);
    if(file_and_real_path === undefined || file_and_real_path.file !== 'process') {
        console.log("process path is wrong");
        return false;
    }

    processes.set(process_path, new_process);
    fs.writeFileSync(file_and_real_path.real_path, JSON.stringify(new_process, null, 2));
    return true;
}