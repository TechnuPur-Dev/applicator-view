import { EquipmentType} from '@prisma/client';


interface CreateData {
    imageUrl: string; //  (Required)
    serialNumber: string; 
    equipmentType: EquipmentType;  
    isRegistered: boolean; // required 
    documentUrl: string; // 
    warrantyExpiration: Date; // 
  
};

export { CreateData };
