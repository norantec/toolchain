import * as _ from 'lodash';
import { CommonExceptionUtil } from './common-exception-util.class';

export class CheckerUtil {
    public static check(checkers: Record<string, () => boolean>) {
        if (!_.isObjectLike(checkers)) {
            return;
        }

        const invalidCheckerNames: string[] = [];

        for (const [name, checker] of Object.entries(checkers)) {
            if (typeof checker !== 'function') {
                break;
            }

            const result = (() => {
                try {
                    const currentResult = checker();

                    if (currentResult !== true) {
                        return false;
                    }

                    return currentResult;
                } catch (e) {
                    return true;
                }
            })();

            if (result) {
                invalidCheckerNames.push(name);
            }
        }

        if (invalidCheckerNames.length > 0) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_CHECKERS, {
                checkerNames: invalidCheckerNames,
            });
        }
    }
}
