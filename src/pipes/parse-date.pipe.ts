import {
    PipeTransform,
    Injectable,
} from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
    public transform(value: string) {
        const result = new Date(value);

        if (Date.prototype.toString.call(result) === 'Invalid Date') {
            return undefined;
        }

        return result;
    }
}
