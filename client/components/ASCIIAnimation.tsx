import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FireOneColors } from "@/constants/theme";

const fireExtinguisherFrames = [
  `
    [===]
     | |    ~~~
     |_|   ~~~~~
    /   \\   ~~~
   |     |
   |_____|    O
    || ||    /|\\
              |
             / \\
  `,
  `
    [===]
     | |      ~~
     |_|    ~~~~
    /   \\    ~~
   |     |
   |_____|      O
    || ||      \\|/
               / \\
              
  `,
  `
    [===]
     | |        ~
     |_|      ~~~
    /   \\      ~
   |     |
   |_____|        O
    || ||        /|
                / \\
               
  `,
  `
         [===]
          | |    ~~
          |_|  ~~~~
         /   \\  ~~
        |     |
        |_____|    O
         || ||    /|\\
                   |
                  / \\
  `,
  `
              [===]
               | |  ~~~
               |_| ~~~~~
              /   \\ ~~~
             |     |
             |_____|  O
              || || \\|/
                    / \\
                   
  `,
];

const hoseReelFrames = [
  `
                      @@@@@
     ~~~~~~>         @     @
    ~~~~~~~>        @ @@@ @
     ~~~~~~>         @   @
                      @@@@@
  `,
  `
                     @@@@@
      ~~~~~>        @     @
     ~~~~~~>       @ @@@ @
      ~~~~~>        @   @
                     @@@@@
  `,
  `
                    @@@@@
       ~~~~>       @     @
      ~~~~~>      @ @@@ @
       ~~~~>       @   @
                    @@@@@
  `,
  `
                   @@@@@
        ~~~>      @     @
       ~~~~>     @ @@@ @
        ~~~>      @   @
                   @@@@@
  `,
  `
                  @@@@@
         ~~>     @     @
        ~~~>    @ @@@ @
         ~~>     @   @
                  @@@@@
  `,
];

const combinedChaseFrames = [
  `
     *        
    \\|/  [=]     ~~~~~~>    @@@@@
     |   |_|    ~~~~~~~>   @  O  @
    / \\  /_\\     ~~~~~~>    @@@@@
  `,
  `
      *       
     \\|/ [=]      ~~~~~>   @@@@@
      |  |_|     ~~~~~~>  @  O  @
     / \\ /_\\      ~~~~~>   @@@@@
  `,
  `
       *      
    --|--[=]       ~~~~>  @@@@@
      |  |_|      ~~~~~> @  O  @
     / \\ /_\\       ~~~~>  @@@@@
  `,
  `
        *     
     \\|/  [=]       ~~~> @@@@@
      |   |_|      ~~~~>@  O  @
     / \\  /_\\       ~~~> @@@@@
  `,
  `
         *    
      \\|/[=]         ~~>@@@@@
       | |_|        ~~~>@ O  @
      / \\/_\\         ~~>@@@@@
  `,
  `
     *        
    \\|/  [=]     ~~~~~~>    @@@@@
     |   |_|    ~~~~~~~>   @  O  @
    / \\  /_\\     ~~~~~~>    @@@@@
  `,
];

const firemanChaseFrames = [
  `
  FYRE ONE AI

     *            @@@@@
    /|\\  [=]     @     @
     |   |_|    @ @@@ @
    / \\  /_\\     @   @
         ~~~>    @@@@@
  `,
  `
  FYRE ONE AI

      *           @@@@@
     \\|/ [=]     @     @
      |  |_|    @ @@@ @
     / \\ /_\\     @   @
          ~~>    @@@@@
  `,
  `
  FYRE ONE AI

       *          @@@@@
    --|--[=]     @     @
      |  |_|    @ @@@ @
     / \\ /_\\     @   @
           ~>    @@@@@
  `,
  `
  FYRE ONE AI

        *         @@@@@
     \\|/  [=]    @     @
      |   |_|   @ @@@ @
     / \\  /_\\    @   @
            >    @@@@@
  `,
  `
  FYRE ONE AI

       *          @@@@@
      \\|/[=]     @     @
       | |_|    @ @@@ @
      / \\/_\\     @   @
           ~>    @@@@@
  `,
  `
  FYRE ONE AI

      *           @@@@@
     /|\\  [=]    @     @
      |   |_|   @ @@@ @
     / \\  /_\\    @   @
          ~~>    @@@@@
  `,
];

interface ASCIIAnimationProps {
  variant?: "chase" | "fireman";
  fps?: number;
}

export function ASCIIAnimation({
  variant = "chase",
  fps = 4,
}: ASCIIAnimationProps) {
  const frames = variant === "fireman" ? firemanChaseFrames : combinedChaseFrames;
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames.length, fps]);

  return (
    <View style={styles.container}>
      <Text style={styles.asciiText}>{frames[currentFrame]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  asciiText: {
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 13,
    color: FireOneColors.orange,
    letterSpacing: 0,
  },
});
