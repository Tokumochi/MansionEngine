import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

import { FileType } from './Directory';

import './style.css'

const socket = io("http://127.0.0.1:8080");

function Import(props: {
	path: string,
	width: number, 
	height: number,
	clickType: (type_path: string) => void,
	clickData: (data_path: string) => void,
	clickProcess: (process_path: string) => void,
	clickRoom: (croom_path: string) => void,
}) {
	const {width, height, clickType, clickData, clickProcess, clickRoom} = props;

	const [is_room, setIsDir] = useState(false);
	const [files, setFiles] = useState(new Map([] as [string, FileType][]))

	const [path, setPath] = useState(props.path);

	useEffect(() => {
    	socket.on("update dir", (dir: {is_room: boolean, files: [string, FileType][]}) => { setIsDir(dir.is_room); setFiles(new Map(dir.files)); });
	}, []);

	useEffect(() => {
		socket.on("create new file", (new_name: string, new_type: FileType) => { setFiles(new Map(files.set(new_name, new_type))) });
		socket.on("delete file", (target_name: string) => {
			files.delete(target_name);
			setFiles(new Map(files));
		});
	}, [files]);

	useEffect(() => {
    	socket.emit("join dir", path);
	}, [path])

	let dir_name: string | undefined = undefined;
	let pre_dir_path: string | undefined = undefined;
	if(path !== '') {
		const routes = path.split('-');
		dir_name = routes.pop();
		pre_dir_path = routes.join('-');
	}

	const col_num = 4;

	const file_width = 100;
	const file_height = 75;

	return <div className='border border-3 border-dark bg-white overflow-scroll' style={{width: width, height: height}}>
		<header className='border-bottom border-dark'>
			<div className='d-flex p-1'>
				{
					(pre_dir_path || pre_dir_path === '') &&
					<div className="btn btn-secondary me-4 p-1" onClick={() => {
						if(pre_dir_path === undefined) {
							console.log("What's happening!?");
							return;
						}
						setPath(pre_dir_path);
					}}>
						上のディレクトリへ
					</div>
				}
				{ is_room && <h4 className='m-0 text-room'>{ dir_name }(room)</h4> }
		  		{ !is_room && <h4 className='m-0 text-directory'>{ dir_name }</h4> }
			</div>
		</header>
    	<main>
				<div className='container d-flex justify-content-start flex-wrap'>
    		{
      		Array.from(files).map(([file_name, file_type], index) => {
      			return <div className='col-4 mt-5'>
							<div className={`${"btn border border-dark border-5 rounded-4 ratio ratio-4x3"} ${'bg-' + file_type}`} onClick={() => {
								switch(file_type) {
									case "type":
										clickType(path + '-' + file_name);
										break;
									case "data":
										clickData(path + '-' + file_name);
										break;
									case "process":
										clickProcess(path + '-' + file_name);
										break;
									case "room":
										clickRoom(path + '-' + file_name);
								}
							}}>
								<div className='d-flex flex-column justify-content-center align-items-center'>
								  <h5 className='w-100 m-0 text-center text-wrap mb-2'>
										{ file_name.replaceAll('_', ' ') }
								  </h5>
									{
										(file_type === 'room' || file_type === 'directory') &&
										<button className='btn btn-secondary border border-dark border-3 w-50 p-0' onClick={(e) => {
											e.stopPropagation();
											setPath((path === '' ? '' : path + '-') + file_name);
										}}>
											開く
										</button>
									}
								</div>
							</div>
						</div>
       		})
    		}
				</div>
    	</main>
	</div>
}

export default Import;