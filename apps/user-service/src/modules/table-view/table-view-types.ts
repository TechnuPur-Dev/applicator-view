import { ViewTable } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';

interface CreateViewParams {
	tableName: ViewTable;
	config: {
		columns: JsonObject;
	};
}

export { CreateViewParams };
