// import { UserRole } from '@prisma/client';
// import { ProfileStatus } from '@prisma/client';
// import { User } from '../../../../../shared/types/global';
interface chemicalData {
    productName: string,
    registrationNumber: string,
    registrationType: string,
    companyNumber: string,
    companyName: string,
    firstRegistrationDate: Date,
    status: string,
    statusDescription: string,
    statusGroup: string,
    statusDate: Date,
    useType: string,
    signalWord: string,
    rupFlag: boolean,
    rupReason: string,
    pesticideType: string,
    pesticideCategory: string,
    physicalForm: string,
    ais: string,
    pests: string,
    sites: string,
    team: string,
    pmEmail: string,
    ridpNumberSort: string,
    usePattern: string,
    transferHistory: string,
    abns: string,
    meTooFlag: boolean,
    meTooRefs: string,
    maxLabelDate: Date,
    labelDates: string,
    labelNames: string,
}

export {
    chemicalData
}