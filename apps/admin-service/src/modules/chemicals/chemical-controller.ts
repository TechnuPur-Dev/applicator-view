import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import chemicalService from './chemical-service';
import pick from '../../../../../shared/utils/pick';

const bulkUploadChemicals = catchAsync(async (req: Request, res: Response) => {
	// const file = req.file;
	  const fileBuffer = req.file?.buffer;
	   console.log(fileBuffer,'dataupdate')
	if (!fileBuffer) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await chemicalService.bulkUploadChemicals(fileBuffer);
	res.status(httpStatus.OK).json(result);
});
const getAllChemicals = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);
	const chemicals = await chemicalService.getAllChemicals(options);
	res.status(httpStatus.OK).json(chemicals);
});

const updateChemical = catchAsync(async (req: Request, res: Response) => {
	
	const ChemicalId = +req.params.id;
	const data = req.body;
	const result = await chemicalService.updateChemical(ChemicalId, data);
	res.status(httpStatus.OK).json(result);
});
const deleteChemical = catchAsync(async (req: Request, res: Response) => {
	const ChemicalId = +req.params.id;
	// const userId = req.payload.id;
	const result = await chemicalService.deleteChemical(ChemicalId);
	res.status(httpStatus.OK).json(result);
});

export default {
	getAllChemicals,
	bulkUploadChemicals,
	deleteChemical,
	updateChemical


};
