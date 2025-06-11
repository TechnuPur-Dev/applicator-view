import { EquipmentType} from '@prisma/client';


interface CreateData {
    manufacturer: string; //  (Required)
    type: EquipmentType; 
    model:string, 
    nickname : string,
    serialNumber: string; 
    userId :number
  
};
interface UpdateData {
    id:number,
    manufacturer: string; //  (Required)
    type: EquipmentType; 
    model:string, 
    nickname : string,
    serialNumber: string; 
    userId :number
  
};

export { CreateData,UpdateData };
