use solana_program::{
    entrypoint,
    account_info::{next_account_info,AccountInfo},
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey};
use borsh::{BorshSerialize,BorshDeserialize};

entrypoint!(process_instructions);

#[derive(BorshDeserialize,BorshSerialize)]
enum Instruction_data{
    Initialize(u32),
    Increment(u32),
    Decrement(u32)
}


#[derive(BorshDeserialize,BorshSerialize)]
struct Counter{
	data:u32
}

pub fn process_instructions(
    _program_id : &Pubkey,
    accounts: &[AccountInfo],
    instruction_data:&[u8]
    ) -> ProgramResult{
    let acc = next_account_info(&mut accounts.iter())?;
    let data = Instruction_data::try_from_slice(instruction_data)?;
    match data{
	Instruction_data::Initialize(value) =>{
		let counter = Counter{ data : value };
		counter.serialize(&mut *acc.data.borrow_mut())?;
	},
        Instruction_data::Increment(value) => {
		let mut counter = Counter::try_from_slice(&mut acc.data.borrow())?;
		counter.data += value;
		msg!("Account incremented with {}",value);
    		counter.serialize(&mut *acc.data.borrow_mut())?;
        },
	Instruction_data::Decrement(value) =>{
 		let mut counter = Counter::try_from_slice(&mut acc.data.borrow())?;
		counter.data -= value;
		msg!("Account incremented with {}",value);
        	counter.serialize(&mut *acc.data.borrow_mut())?;
	}
    }

    Ok(())
}
