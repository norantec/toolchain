import {
    Injectable,
    PipeTransform,
} from '@nestjs/common';

@Injectable()
export class DecodeUriComponentPipe implements PipeTransform {
    public transform(value: any) {
        if (typeof value !== 'string') {
            return value;
        }
        return decodeURIComponent(value);
    }
}
