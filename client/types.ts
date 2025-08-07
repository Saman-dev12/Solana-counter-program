
export class Counter {
	data : 0;
	constructor({data}:{data:number}){
		this.data = data;
	}
}

export const counterSchema :borsh.Schema = {struct : {data:'u32'}};


export const account_size = borsh.serialize(
	counterSchema,
	new Counter({data:0}),
).length;


