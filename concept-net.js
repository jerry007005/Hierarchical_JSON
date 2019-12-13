class term{
	constructor(name, child, branch ,parents){
		this.name = name;
		this.child = new Array(child);
		this.parents = parents;
		this.flag = 0;
		this.branch = branch;
		this.tree = {};
	}

	add(child){
		this.child.push(child);
	}

	extend(){

		let temp_list = [];

		if (this.flag == 0){
			let counter;
			for (counter = 0; counter < this.child.length; counter++){

				if (this.child[counter] == null){
					continue;
				}

				let temp_var = this.child[counter].flag == 1 ? this.child[counter].tree : this.child[counter].extend();

				temp_list.push(temp_var);
			}

			this.tree[this.name] = Object.assign({},...temp_list)		//Joing result togather

		}

		this.flag = 1;
		return this.tree;
	}
}


async function Processing(start,method){

	let extend_list = [];
	let result = {};

	result[start] = new term(start,null,[start],await method(start));
	let process_queue = [result[start]];	

	while (process_queue.length > 0){
		let process_node = process_queue.shift();
		extend_list.push(process_node.name);

		if (process_node.parents == null){
			result[process_node.name] = process_node;
			continue;
		}
		
		for(const element of process_node.parents){
			
			//Preventing Cycle
			if (process_node.branch.includes(element)){	
				process_node.parents.filter(x => x != element);
			}
			
			else if (element in result){
				result[element].add(process_node)
			}
			else{
				let parent = process_node.branch.length > 4 ? null : await method(element);				//Stop finding parents after the branch size greater than 5
				x = new term(element, process_node, process_node.branch.concat(element), parent);
				process_queue.push(x);
				result[element] = x;
			}
		}
	}

	let counter;
	for (counter = 0; counter < extend_list.length; counter++){
		result[extend_list[counter]].extend();
	}
	return result;
}



//Function to connect API to request the parenet term

async function API_connect(request_word){
	request_word = request_word.replace(' ','_');
	const request = require('request');
	let parent;

	const options ={
		url: 'http://api.conceptnet.io/query?limit=70&rel=/r/IsA&other=/c/en&start=/c/en/' + request_word,
		headers: {
			'Accept' : 'application/json',
			'Accept-Charset' : 'utf-8'
		}
	};


	return new Promise(function(resolve,reject){
			request(options, async function(err, res, body){
			let term = JSON.parse(body.replace('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">',''));
			let objectArray = Array.from(new Set(term['edges'].filter(element => element.weight > 0.6)));
			setTimeout(function(){
				const result = Array.from(new Set(objectArray.sort((a,b) => b.weight - a.weight).map(element => element.end.term.replace('/c/en/','').replace('_',' ')))).slice(0,4);
				resolve(result)},2000);
		});
	});
}


function Internal_Data(word){
	const Data = require('./Data.js');
	const tools = new Data;
	return tools.getTerm(word);

}

async function External_data(word){
	try{
		const p = await API_connect(word);
		return p;
	}catch(err){
		console.error('Error: ',err);
	}
}


async function main(){

	const option = 0;		//Manipulate this variable to change the data source use by program. 0 represent external module "Data.json", 1 represent data from ConceptNet API

	const target = process.argv[2]; 		//User given input to form hierarchical JSON format

	const method = option == 0 ? Internal_Data : External_data; 

	const dict = await Processing(target,method);  //Main process for the task

	//Output reault
	for (var key in dict){
	 	if (dict[key].parents == null || dict[key].parents.length == 0){
	 		console.log(JSON.stringify(dict[key].tree, null, "\t"));
	 	}
	}
}

main()