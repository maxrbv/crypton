import { Idl, Program } from '@project-serum/anchor';
import provider from "./AnchorProvider";
import { programId } from "./pubKey";
import idl from '../idl/crypton_test.json' //huita

const anchorProgram = new Program(idl as Idl, programId, provider);
export default anchorProgram;