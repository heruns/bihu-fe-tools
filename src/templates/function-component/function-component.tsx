// 组件注释
import React from 'react';
import styles from './function-component.module.scss';

export interface FunctionComponentProps {}

const FunctionComponent: React.FC<FunctionComponentProps> = () => {

  return (
    <div className={styles.functionComponent}>function-component</div>
  );
};

export default FunctionComponent;
